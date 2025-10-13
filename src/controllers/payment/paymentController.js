const crypto = require("crypto");
const Payment = require("../../models/Payment/paymentModel");
const Customer = require("../../models/Customer/customerModel");
const Bid = require("../../models/Inspector/bidModel");
const errorHandler = require("../../utils/errorHandler");
const razorpayInstance = require("../../config/razorpay");
const InspectionEnquiry = require("../../models/Customer/customerEnquiryForm");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const QuickServiceRequest = require("../../models/QuickService/quickServicesModel");
const sendCustomerPaymentConfirmation = require("../../utils/EmailServices/sendCustomerPaymentConfirmation");
const sendTeamPaymentNotification = require("../../utils/EmailServices/sendTeamPaymentNotification");
const sendQuickServiceCustomerConfirmation = require("../../utils/EmailServices/sendQuickServiceCustomerConfirmation");
const sendQuickServiceTeamNotification = require("../../utils/EmailServices/sendQuickServiceTeamNotification");

const createOrderForEnquiry = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can initiate payment"));
    }

    const { enquiryId } = req.params;
    const { amount } = req.body;
    if (!amount || typeof amount !== "number") {
      return next(errorHandler(400, "Bid amount is required"));
    }

    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(404, "Enquiry not found or unauthorized"));
    }

    if (enquiry.status !== "draft") {
      return next(
        errorHandler(400, "Payment already initiated or enquiry submitted")
      );
    }

    const customer = await Customer.findById(req.user._id).select(
      "name email mobileNumber"
    );
    if (!customer) {
      return next(errorHandler(404, "Customer profile not found"));
    }
    
    const amountInPaise = amount * 100;

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${enquiryId}`,
      payment_capture: 1,
    });

    const payment = await Payment.create({
      enquiry: enquiry._id,
      customer: req.user._id,
      amount: amount,
      currency: "INR",
      status: "pending",
      phase: "initial",
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      message: "Razorpay order created",
      order: razorpayOrder,
      enquiryId: enquiry._id,
      paymentId: payment._id,
      keyId: process.env.RAZORPAY_KEY_ID,
      customerDetails: {
        name: customer.name,
        email: customer.email,
        mobileNumber: customer.mobileNumber,
      },
    });
  } catch (error) {
    next(
      errorHandler(500, "Failed to create Razorpay order: " + error.message)
    );
  }
};

const webHooksController = async (req, res, next) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const isWebhookValid = validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isWebhookValid) {
      return next(errorHandler(400, "Webhook Signature is not valid"));
    }

    const event = req.body.event;
    const paymentDetails = req.body.payload.payment.entity;

    if (event === "payment.captured" && paymentDetails) {
      const orderId = paymentDetails.order_id;
      const razorpayPaymentId = paymentDetails.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment || payment.status === "paid") {
        return res.status(404).json({
          success: false,
          message: "Payment record not found or already processed",
        });
      }

      payment.status = "paid";
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.paymentMode = "razorpay";
      await payment.save();

      const enquiry = await InspectionEnquiry.findById(payment.enquiry);
      if (!enquiry) {
        return res
          .status(404)
          .json({ success: false, message: "Enquiry not found" });
      }

      const bid = await Bid.findOne({
        enquiry: enquiry._id,
        customerViewAmount: payment.amount,
        status: "active",
      });

      if (!bid) {
        return res
          .status(404)
          .json({ success: false, message: "Matching bid not found" });
      }

      bid.status = "won";
      await bid.save();

      await Bid.updateMany(
        { enquiry: enquiry._id, _id: { $ne: bid._id }, status: "active" },
        { $set: { status: "lost" } }
      );

      enquiry.confirmedBid = bid._id;
      enquiry.status = "completed";
      await enquiry.save();

      return res.status(200).json({
        success: true,
        message: "Bid confirmed via webhook",
        bidId: bid._id,
      });
    }

    return res
      .status(200)
      .json({ message: "Webhook received, no action taken" });
  } catch (error) {
    console.error(error.message);
    return next(errorHandler(400, error.message));
  }
};

const verifyPaymentAndConfirmBid = async (req, res, next) => {
  try {
    const {
      paymentId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      bidId,
    } = req.body;

    if (
      !paymentId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature ||
      !bidId
    ) {
      return next(
        errorHandler(400, "Missing required payment verification fields")
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === "paid") {
      return res.status(404).json({
        success: false,
        message: "Payment not found or already processed",
      });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    await payment.save();

    const bid = await Bid.findById(bidId).populate(
      "enquiry inspector customer"
    );
    if (!bid || bid.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Bid not found or already confirmed",
      });
    }
    if (bid.status === "won") {
      return res.status(200).json({
        success: true,
        message: "Bid already confirmed",
        bidId: bid._id,
      }); 
    }

    bid.status = "won";
    await bid.save();

    await Bid.updateMany(
      { enquiry: bid.enquiry._id, _id: { $ne: bid._id }, status: "active" },
      { $set: { status: "lost" } }
    );

    bid.enquiry.confirmedBid = bid._id;
    bid.enquiry.status = "completed";
    await bid.enquiry.save();

    await sendCustomerPaymentConfirmation(bid.customer, bid, payment);
    await sendTeamPaymentNotification(bid.customer, bid, payment);

    res.status(200).json({
      success: true,
      message: "Payment verified and bid confirmed",
      bidId: bid._id,
    });
  } catch (error) {
    next(errorHandler(500, "Verification failed: " + error.message));
  }
};

const verifyQuickServicePayment = async (req, res, next) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
      req.body;

    if (
      !paymentId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return next(
        errorHandler(400, "Missing required payment verification fields")
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature",
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === "paid") {
      return res.status(404).json({
        success: false,
        message: "Payment not found or already processed",
      });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    await payment.save();

    const quickRequest = await QuickServiceRequest.findById(payment.enquiry);
    if (!quickRequest) {
      return res.status(404).json({
        success: false,
        message: "Quick service request not found",
      });
    }

    quickRequest.status = "paid";
    await quickRequest.save();

    await sendQuickServiceCustomerConfirmation(
      quickRequest.customer,
      quickRequest,
      payment
    );
    await sendQuickServiceTeamNotification(
      quickRequest.customer,
      quickRequest,
      payment
    );

    return res.status(200).json({
      success: true,
      message: "Quick service payment verified",
      requestId: quickRequest._id,
    });
  } catch (error) {
    next(
      errorHandler(500, "Quick service verification failed: " + error.message)
    );
  }
};

module.exports = {
  createOrderForEnquiry,
  webHooksController,
  verifyPaymentAndConfirmBid,
  verifyQuickServicePayment,
};
