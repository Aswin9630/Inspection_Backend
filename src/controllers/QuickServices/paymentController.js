const QuickServicePayment = require("../../models/QuickService/QuickServicePaymentModel");
const GenericPayment = require("../../models/Payment/paymentModel") || null;
const mongoose = require("mongoose");
const QuickServiceOrder = require("../../models/QuickService/QuickServiceOrder");
const QuickServiceRequestOtherLocation = require("../../models/QuickService/QuickServiceRequestOtherLocationModel");


async function getQuickServiceInvoice(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const paymentId = req.params.paymentId;
    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ error: "Invalid payment id" });
    }

    // Fetch payment
    const payment = await QuickServicePayment.findOne({ _id: paymentId, userId: user._id }).lean();
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    // Try fetch order linked by paymentId or razorpay_order_id
    let order = null;
    if (payment._id) {
      order = await QuickServiceOrder.findOne({ paymentId: payment._id }).lean();
    }
    if (!order && payment.razorpay_order_id) {
      order = await QuickServiceOrder.findOne({ razorpay_order_id: payment.razorpay_order_id }).lean();
    }

    // If order exists, use its items; if not, try to get items from payment.metadata.order_meta or from enquiry records
    let items = [];
    if (order && Array.isArray(order.items) && order.items.length) {
      items = order.items.map((it) => ({
        description: it.serviceType || it.description || "Quick service",
        quantity: it.volume || 1,
        unit: it.unit || "",
        unitPriceMajor: Number(it.price || 0),
        currency: it.currency || order.currency || payment.currency,
        totalMajor: Number(it.price || 0) * (it.quantity || it.volume || 1),
      }));
    } else if (payment.metadata && payment.metadata.order_meta && Array.isArray(payment.metadata.order_meta.items)) {
      items = payment.metadata.order_meta.items.map((it) => ({
        description: it.serviceType || "Quick service",
        quantity: it.volume || 1,
        unit: it.unit || "",
        unitPriceMajor: Number(it.price || 0),
        currency: it.currency || payment.currency,
        totalMajor: Number(it.price || 0) * (it.quantity || it.volume || 1),
      }));
    } else {
      // try to find linked enquiry / request (QuickServiceRequest or QuickServiceRequestOtherLocation)
      // Search by order metadata or payment.metadata.requestId
      if (payment.metadata && payment.metadata.requestId) {
        const reqDoc = await QuickServiceRequestOtherLocation.findById(payment.metadata.requestId).lean();
        if (reqDoc && Array.isArray(reqDoc.items)) {
          items = reqDoc.items.map((it) => ({
            description: it.serviceType || "Quick service",
            quantity: it.volume || 1,
            unit: it.unit || "",
            unitPriceMajor: it.price || 0,
            currency: payment.currency,
            totalMajor: (it.price || 0) * (it.volume || 1),
          }));
        }
      }
    }

    // If items still empty and order has items snapshot, fall back to that
    if (!items.length && order && Array.isArray(order.items)) {
      items = order.items.map((it) => ({
        description: it.serviceType || "Quick service",
        quantity: it.volume || 1,
        unit: it.unit || "",
        unitPriceMajor: Number(it.price || 0),
        currency: it.currency || order.currency || payment.currency,
        totalMajor: Number(it.price || 0) * (it.quantity || it.volume || 1),
      }));
    }

    // Compute subtotal, tax, total in major units
    const subtotalMajor = items.reduce((s, it) => s + Number(it.totalMajor || it.unitPriceMajor || 0), 0);
    // Use payment.metadata.order_meta.tax if available, else try order.tax, else compute basic tax rule (example: 18% for India)
    let taxMajor = 0;
    if (payment.metadata && payment.metadata.order_meta && typeof payment.metadata.order_meta.tax === "number") {
      taxMajor = Number(payment.metadata.order_meta.tax || 0);
    } else if (order && typeof order.tax === "number") {
      taxMajor = Number(order.tax || 0);
    } else {
      // fallback: simple rule: 18% if country IN
      const country = (items[0]?.country || order?.country || payment.metadata?.country || "IN").toString().toUpperCase();
      const taxRate = country === "IN" ? 0.18 : 0;
      taxMajor = Number((subtotalMajor * taxRate).toFixed(2));
    }
    const totalMajor = Number((subtotalMajor + taxMajor).toFixed(2));

    // Invoice payload
    const invoice = {
      company: {
        name: "Qualty.ai",
        address: "Qualty.ai / Your Company Address",
        phone: "+91-XXXXXXXXXX",
        email: "billing@qualty.ai",
        gst: "", // optional
      },
      customer: {
        id: user._id,
        name: (user.name || user.fullName || user.email),
        email: user.email,
      },
      payment: {
        id: payment._id,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        currency: payment.currency,
        amountMajor: Number((payment.amount || 0) / 100), // stored in smallest units
        status: payment.status,
        capturedAt: payment.createdAt,
      },
      order: order
        ? {
            id: order._id,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            currency: order.currency,
          }
        : null,
      items,
      totals: {
        subtotal: subtotalMajor,
        tax: taxMajor,
        total: totalMajor,
        currency: items[0]?.currency || order?.currency || payment.currency || "INR",
      },
      raw: {
        payment,
        order,
      },
    };

    return res.status(200).json({ ok: true, invoice });
  } catch (err) {
    console.error("getQuickServiceInvoice error:", err);
    return res.status(500).json({ error: "Failed to build invoice" });
  }
}

async function getQuickServicePayments(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const q = (req.query.q || "").trim();
    const status = (req.query.status || "").trim().toLowerCase();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const filter = { userId: mongoose.Types.ObjectId(user._id) };

    if (q) {
      filter.$or = [
        { razorpay_order_id: { $regex: q, $options: "i" } },
        { razorpay_payment_id: { $regex: q, $options: "i" } },
      ];
    }

    if (status) filter.status = status;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const [items, total] = await Promise.all([
      QuickServicePayment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      QuickServicePayment.countDocuments(filter),
    ]);

    return res.status(200).json({
      ok: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    console.error("getQuickServicePayments error:", err);
    return res.status(500).json({ error: "Failed to fetch quick service payments" });
  }
}

async function getQuickServicePaymentById(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

    const doc = await QuickServicePayment.findOne({ _id: id, userId: user._id }).lean();
    if (!doc) return res.status(404).json({ error: "Payment not found" });

    return res.status(200).json({ ok: true, payment: doc });
  } catch (err) {
    console.error("getQuickServicePaymentById error:", err);
    return res.status(500).json({ error: "Failed to fetch payment" });
  }
}

async function getOtherPayments(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!GenericPayment) return res.status(400).json({ error: "Other payments model not configured" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filter = { userId: user._id };

    const [items, total] = await Promise.all([
      GenericPayment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      GenericPayment.countDocuments(filter),
    ]);

    return res.status(200).json({ ok: true, page, limit, total, pages: Math.ceil(total / limit), items });
  } catch (err) {
    console.error("getOtherPayments error:", err);
    return res.status(500).json({ error: "Failed to fetch other payments" });
  }
}

module.exports = {
  getQuickServicePayments,
  getQuickServicePaymentById,
  getQuickServiceInvoice,
  getOtherPayments,
};
