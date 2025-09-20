const crypto = require("crypto");
const QuickServiceLocation = require("../../models/QuickService/quickServiceModel");
const InspectionEnquiry = require("../../models/Customer/customerEnquiryForm");
const Payment = require("../../models/Payment/paymentModel");
const razorpay = require("../../config/razorpay");

const getLocationList = async (req, res, next) => {
  try {
    const locations = await QuickServiceLocation.find().select("state location price");
    res.json({ success: true, locations });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch location list"));
  }
};


const submitQuickServiceForm = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Unauthorized. Please login."));
    }

    const { location, commodityCategory, inspectionDate, inspectionTypes, contact } = req.body;

    const locationData = await QuickServiceLocation.findOne({ location });
    if (!locationData) return next(errorHandler(404, "Location not found"));

    const enquiry = await InspectionEnquiry.create({
      customer: req.user._id,
      inspectionLocation: location,
      country: "India",
      commodityCategory,
      inspectionDate: {
        from: new Date(inspectionDate),
        to: new Date(inspectionDate),
      },
      inspectionBudget: locationData.price,
      platformFee: Math.round(locationData.price * 0.3),
      status: "draft",
      urgencyLevel: "High",
      inspectionTypes,
      contact,
      selectionSummary: "Quick Service",
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: locationData.price * 100,
      currency: "INR",
      receipt: `quick_${enquiry._id}`,
      payment_capture: 1,
    });

    const payment = await Payment.create({
      enquiry: enquiry._id,
      customer: req.user._id,
      amount: locationData.price,
      currency: "INR",
      status: "pending",
      phase: "initial",
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      message: "Quick service enquiry created",
      order: razorpayOrder,
      enquiryId: enquiry._id,
      paymentId: payment._id,
      customerDetails: {
        name: req.user.name,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to submit quick service form"));
  }
};





const verifyQuickServicePayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return next(errorHandler(403, "Invalid payment signature"));
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return next(errorHandler(404, "Payment record not found"));

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    await InspectionEnquiry.findByIdAndUpdate(payment.enquiry, {
      status: "submitted",
    });

    res.json({ success: true, message: "Payment verified and enquiry submitted" });
  } catch (error) {
    next(errorHandler(500, "Payment verification failed"));
  }
};

module.exports = {
  getLocationList,
  submitQuickServiceForm,
  verifyQuickServicePayment,
};
