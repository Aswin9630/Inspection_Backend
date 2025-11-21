const razorpay = require("../../config/razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();
const CartItem = require("../../models/QuickService/CartItem");
const LocationPrice = require("../../models/QuickService/LocationPrice");
const QuickServicePayment = require("../../models/QuickService/QuickServicePaymentModel");
const QuickServiceOrder = require("../../models/QuickService/QuickServiceOrder");
const { sendPaymentNotification, sendEnquiryNotification } = require("../../utils/EmailServices/QuickServiceEmail/sender");

const TAX_RATES = {
  IN: 0.18,
  DEFAULT: 0.0,
};

function getTaxRateForCountry(countryNameOrCode) {
  if (!countryNameOrCode) return TAX_RATES.DEFAULT;
  const c = String(countryNameOrCode).trim().toUpperCase();
  if (c === "INDIA" || c === "IN") return TAX_RATES.IN;
  return TAX_RATES.DEFAULT;
}
  
function toSmallestUnit(amountMajor) {
  return Math.round(Number(amountMajor) * 100);
}
  
function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const createOrder = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { amount, currency = "INR", receipt } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Invalid amount" });
    const amountInSmall = toSmallestUnit(amount, currency);

    const options = {
      amount: amountInSmall,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return res.status(201).json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      receipt: order.receipt,
      notes: order.notes,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
};
  
const verifyPayment = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_meta } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing verification fields" });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    let fetchedPayment = null;
    try {
      fetchedPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (err) {
      console.warn("Warning: Could not fetch payment details:", err?.message || err);
    }

    const paymentDoc = new QuickServicePayment({
      userId: user._id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: fetchedPayment?.amount || 0,
      currency: fetchedPayment?.currency || (order_meta?.currency || "INR"),
      status: fetchedPayment?.status || "captured",
      metadata: {
        fetchedPayment,
        order_meta,
      },
    });

    await paymentDoc.save();

    const cartItems = await CartItem.find({ userId: user._id });

    if (!cartItems || cartItems.length === 0) {
      const orderDoc = new QuickServiceOrder({
        userId: user._id,
        paymentId: paymentDoc._id,
        razorpay_order_id,
        status: "paid",
        currency: paymentDoc.currency,
        subtotal: 0,
        tax: 0,
        total: (paymentDoc.amount || 0) / 100,
        items: [],
      });
      await orderDoc.save();

       try {
        await sendPaymentNotification({
          user,
          order: orderDoc,
          payment: paymentDoc,
          items: [],
          totals: { subtotal: 0, tax: 0, total: (paymentDoc.amount || 0) / 100, currency: paymentDoc.currency },
          company: { name: "Qualty.ai", email: process.env.EMAIL_USER, phone: process.env.COMPANY_PHONE || "" },
        });
      } catch (mailErr) {
        console.error("sendPaymentNotification error:", mailErr);
      }

      return res.status(200).json({ success: true, payment: paymentDoc, order: orderDoc });
    }

    const itemsSnapshot = cartItems.map((ci) => ({
      cartItemId: ci._id,
      serviceType: ci.serviceType,
      country: ci.country,
      location: ci.location,
      commodity: ci.commodity,
      volume: ci.volume,
      unit: ci.unit,
      price: ci.price,
      currency: ci.currency,
      date: ci.date,
    }));

    const subtotalMajor = cartItems.reduce((s, it) => s + Number(it.price || 0), 0);
    const sampleTaxRate = getTaxRateForCountry(cartItems[0]?.country);
    const taxMajor = +(subtotalMajor * sampleTaxRate);
    const totalMajor = +(subtotalMajor + taxMajor);

    const orderDoc = new QuickServiceOrder({
      userId: user._id,
      paymentId: paymentDoc._id,
      razorpay_order_id,
      status: "paid",
      currency: paymentDoc.currency,
      subtotal: subtotalMajor,
      tax: taxMajor,
      total: totalMajor,
      items: itemsSnapshot,
    });

    await orderDoc.save();

    await CartItem.deleteMany({ userId: user._id });
     const emailItems = itemsSnapshot.map((it) => ({
      description: it.serviceType || it.commodity || "Quick service",
      quantity: it.volume || 1,
      unit: it.unit || "",
      unitPriceMajor: Number(it.price || 0),
      totalMajor: Number(it.price || 0) * (it.volume || 1),
      location: it.location,
      commodity: it.commodity,
      date: it.date,
    }));

    const totals = {
      subtotal: subtotalMajor,
      tax: taxMajor,
      total: totalMajor,
      currency: orderDoc.currency || paymentDoc.currency || "INR",
    };

     try {
      await sendPaymentNotification({
        user,
        order: orderDoc,
        payment: paymentDoc,
        items: emailItems,
        totals,
        company: { name: "Qualty.ai", email: process.env.EMAIL_USER, phone: process.env.COMPANY_PHONE || "" },
      });
    } catch (mailErr) {
      console.error("sendPaymentNotification error:", mailErr);
    }

    return res.status(200).json({ success: true, payment: paymentDoc, order: orderDoc });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};
  
const webhookHandler = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
    const payload = req.rawBody;
    const signature = req.headers["x-razorpay-signature"];
    if (!webhookSecret) {
      console.warn("No webhook secret configured");
      return res.status(400).send("Webhook secret not configured");
    }

    const expected = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    if (expected !== signature) {
      console.warn("Invalid webhook signature");
      return res.status(401).send("Invalid webhook signature");
    }

    const event = JSON.parse(payload);

    if (event.event === "payment.captured") {
      const { payment } = event.payload;
      const rpid = payment?.entity?.id;
      const rpamount = payment?.entity?.amount;
      const rpidOrder = payment?.entity?.order_id;

      await QuickServicePayment.findOneAndUpdate(
        { razorpay_payment_id: rpid },
        { status: "captured", amount: rpamount },
        { new: true }
      );

      if (rpidOrder) {
        await QuickServiceOrder.findOneAndUpdate({ razorpay_order_id: rpidOrder }, { status: "paid" });
      }
    } else if (event.event === "payment.failed") {
      const { payment } = event.payload;
      const rpid = payment?.entity?.id;
      await QuickServicePayment.findOneAndUpdate({ razorpay_payment_id: rpid }, { status: "failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("webhookHandler error:", err);
    return res.status(500).send("error");
  }
};
  
const addToCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const {
      serviceType,
      country,
      location,
      commodity,
      volume,
      unit,
      date,
    } = req.body;

    if (
      !userId ||
      !serviceType ||
      !country ||
      !location ||
      !commodity ||
      volume === undefined ||
      volume === null ||
      !unit ||
      !date
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const countryNorm = String(country).trim();
    const regionNorm = String(location).trim();

    let loc = await LocationPrice.findOne({
      country: new RegExp(`^${escapeRegex(countryNorm)}$`, "i"),
      region: new RegExp(`^${escapeRegex(regionNorm)}$`, "i"),
    }).lean();

    if (!loc) {
      loc = await LocationPrice.findOne({
        country: new RegExp(`^${escapeRegex(countryNorm)}$`, "i"),
        region: new RegExp(escapeRegex(regionNorm), "i"),
      }).lean();
    }


    const countryExists = await LocationPrice.exists({
      country: new RegExp(`^${escapeRegex(countryNorm)}$`, "i"),
    });

    const looksLikeIndia = String(countryNorm).toLowerCase().includes("india") || String(countryNorm).toLowerCase() === "in";

    let price = 0;
    let currency = "INR";
    let isEnquiry = true;

    if (loc) {
      if (!countryExists && !looksLikeIndia) {
        price = 0;
        currency = loc.currency || "INR";
        isEnquiry = true;
      } else {
        price = loc.price;
        currency = loc.currency || "INR";
        isEnquiry = false;
      }
    } else {
      if (looksLikeIndia) {
        price = 2500;
        currency = "INR";
        isEnquiry = false;
      } else {
        price = 0;
        currency = "INR";
        isEnquiry = true;
      }
    }

    const cartItem = new CartItem({
      userId,
      serviceType,
      country: countryNorm,
      location: regionNorm,
      commodity,
      volume: Number(volume),
      unit,
      date: (typeof date === "string" ? date : (date instanceof Date ? date.toISOString().split("T")[0] : String(date))),
      price,
      currency,
      isEnquiry,
      enquiryRaised: false,
    });

    await cartItem.save();

    if (!loc && !isEnquiry) {
      try {
       await sendEnquiryNotification({
          user: req.user,
          cartItem,
          company: { name: "Qualty.ai", email: process.env.EMAIL_USER, phone: process.env.COMPANY_PHONE || "" },
          note: "Enquiry created via addToCart (no price/fallback).",
        });
      } catch (mailErr) {
        console.error("sendEnquiryNotification error:", mailErr);
      }
      return res.status(201).json({
        success: true,
        fallback: true,
        message: "Region not in DB. Default price ₹2500 applied for Indian region.",
        cartItem,
      });
    }

    if (!loc && isEnquiry) {
      return res.status(201).json({
        success: true,
        enquiry: true,
        message: "Location not supported. Added to cart as enquiry.",
        cartItem,
      });
    }

    return res.status(201).json({ success: true, cartItem, matchedLocation: loc });
  } catch (err) {
    console.error("addToCart error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
  
const getCartItems = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const items = await CartItem.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (err) {
    console.error("getCartItems error:", err);
    return res.status(500).json({ error: "Failed to fetch cart items" });
  }
};
  
const deleteCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const itemId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const item = await CartItem.findOneAndDelete({ _id: itemId, userId });
    if (!item) {
      return res.status(404).json({ error: "Item not found or unauthorized" });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("deleteCartItem error:", err);
    res.status(500).json({ error: "Failed to delete cart item" });
  }
};
  
const computeTotal = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const items = await CartItem.find({ userId: user._id });
    if (!items.length) return res.status(200).json({ subtotal: 0, tax: 0, total: 0, currency: "INR" });

    const currency = items[0].currency || "INR";
    const subtotal = items.reduce((s, it) => s + (Number(it.price || 0)), 0);
    const taxRate = getTaxRateForCountry(items[0].country);
    const tax = +((subtotal * taxRate).toFixed(2));
    const total = +(subtotal + tax).toFixed(2);

    return res.status(200).json({ subtotal, tax, total, currency });
  } catch (err) {
    console.error("computeTotal error:", err);
    return res.status(500).json({ error: "Failed to compute totals" });
  }
};
  
const markCartItemEnquiryRaised = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const cartItemId = req.params.id;
    const item = await CartItem.findOneAndUpdate(
      { _id: cartItemId, userId: user._id, isEnquiry: true },
      { enquiryRaised: true },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found or not enquiry" });

    try {
      await sendEnquiryNotification({
        user,
        cartItem: item,
        company: { name: "Qualty.ai", email: process.env.EMAIL_USER, phone: process.env.COMPANY_PHONE || "" },
        note: "Customer raised enquiry from quick service.",
      });
    } catch (mailErr) {
      console.error("sendEnquiryNotification error:", mailErr);
    }

    return res.status(200).json({ ok: true, item });
  } catch (err) {
    console.error("markCartItemEnquiryRaised error:", err);
    return res.status(500).json({ error: "Failed to update cart item" });
  }
};

module.exports = {
  addToCart,
  getCartItems,
  deleteCartItem,
  createOrder,
  verifyPayment,
  webhookHandler,
  computeTotal,
  markCartItemEnquiryRaised,
};

