const crypto = require("crypto");
const Payment = require("../../models/Payment/paymentModel");
const Customer = require("../../models/Customer/customerModel");
const Bid = require("../../models/Inspector/bidModel");
const errorHandler = require("../../utils/errorHandler");
const razorpayInstance = require("../../config/razorpay");
const InspectionEnquiry = require("../../models/Customer/newCustomerEnquiryForm");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const QuickServiceRequest = require("../../models/QuickService/quickServicesModel");
const sendCustomerPaymentConfirmation = require("../../utils/EmailServices/sendCustomerPaymentConfirmation");
const sendTeamPaymentNotification = require("../../utils/EmailServices/sendTeamPaymentNotification");
const sendQuickServiceCustomerConfirmation = require("../../utils/EmailServices/sendQuickServiceCustomerConfirmation");
const sendQuickServiceTeamNotification = require("../../utils/EmailServices/sendQuickServiceTeamNotification");
const sendFinalPaymentConfirmation = require("../../utils/EmailServices/sendFinalPaymentConfirmation");

const createInitialOrderForEnquiry = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can initiate payment"));
    }

    const { enquiryId } = req.params;
    const { amount } = req.body;

    const enquiry = await InspectionEnquiry.findById(enquiryId);
    const parsedAmount = Number(amount);

    if (!parsedAmount || isNaN(parsedAmount || parsedAmount <= 0)) {
      return next(errorHandler(400, "Valid bid amount is required"));
    }

    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(404, "Enquiry not found or unauthorized"));
    }

    if (enquiry.status !== "submitted") {
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

    const bid = await Bid.findOne({
      enquiry: enquiry._id,
      status: "active",
    });

    if (!bid || !bid.customerViewAmount) {
      return next(errorHandler(404, "Active bid with valid amount not found"));
    }

    const rawInitialAmount = bid.customerViewAmount * 0.3;
    const initialAmount = Math.max(1, Math.round(rawInitialAmount));
    const amountInPaise = initialAmount * 100;

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${enquiryId}`,
      payment_capture: 1,
    });

    const payment = await Payment.create({
      enquiry: enquiry._id,
      customer: req.user._id,
      amount: initialAmount,
      currency: "INR",
      status: "pending",
      phase: "initial",
      razorpayOrderId: razorpayOrder.id,
    });

    enquiry.paymentPhases.push({
      phase: "initial",
      amount: initialAmount,
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
    });
    await enquiry.save();

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
    console.error("Razorpay error:", error);
    next(
      errorHandler(500, "Failed to create Razorpay order: " + error.message)
    );
  }
};

const createFinalOrderForEnquiry = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can initiate payment"));
    }

    const { enquiryId } = req.params;
    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(404, "Enquiry not found or unauthorized"));
    }

    if (enquiry.status !== "submitted" || enquiry.currentPhase !== "final") {
      return next(errorHandler(400, "Final payment not allowed at this phase"));
    }

    const confirmedBid = await Bid.findById(enquiry.confirmedBid);
    if (!confirmedBid || !confirmedBid.customerViewAmount) {
      return next(errorHandler(404, "Confirmed bid not found"));
    }

    const finalAmount = Math.max(
      1,
      Math.round(confirmedBid.customerViewAmount * 0.7)
    );

    const amountInPaise = finalAmount * 100;

    const existingFinalPayment = await Payment.findOne({
      enquiry: enquiry._id,
      phase: "final",
      status: "paid",
    });

    if (existingFinalPayment) {
      return next(
        errorHandler(400, "Final payment already initiated or completed")
      );
    }

    await Payment.deleteMany({
      enquiry: enquiry._id,
      phase: "final",
      status: "pending",
    });

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_final_${enquiryId}`,
      payment_capture: 1,
    });

    const payment = await Payment.create({
      enquiry: enquiry._id,
      customer: req.user._id,
      amount: finalAmount,
      currency: "INR",
      status: "pending",
      phase: "final",
      razorpayOrderId: razorpayOrder.id,
    });

    enquiry.paymentPhases.push({
      phase: "final",
      amount: finalAmount,
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
    });

    await enquiry.save();

    const customer = await Customer.findById(req.user._id).select(
      "name email mobileNumber"
    );

    res.status(201).json({
      success: true,
      message: "Final Razorpay order created",
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
    console.error("Final Razorpay error:", error);
    next(
      errorHandler(
        500,
        "Failed to create final Razorpay order: " + error.message
      )
    );
  }
};

const webHooksController = async (req, res, next) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const isWebhookValid = validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_TEST_WEBHOOK_SECRET
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

const verifyInitialPaymentAndConfirmBid = async (req, res, next) => {
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
      .createHmac("sha256", process.env.RAZORPAY_TEST_KEY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === "paid" || payment.phase !== "initial") {
      return res.status(404).json({
        success: false,
        message: "Payment not found or already processed",
      });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    payment.paidAt = new Date();
    await payment.save();

    const bid = await Bid.findById(bidId)
      .populate({
        path: "enquiry",
        populate: { path: "customer", model: "Customer" },
      })
      .populate("inspector");

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
    bid.enquiry.status = "submitted";
    bid.enquiry.currentPhase = "final";
    bid.enquiry.paymentPhases = bid.enquiry.paymentPhases.map((p) =>
      p.phase === "initial" ? { ...p, status: "paid", razorpayPaymentId } : p
    );
    await bid.enquiry.save();

    const customer = bid.enquiry.customer;
    if (customer) {
      await sendCustomerPaymentConfirmation(customer, bid, payment);
      await sendTeamPaymentNotification(customer, bid, payment);
    }

    const confirmedBidAmount = bid.customerViewAmount;
    const amountPaid = payment.amount;
    const balanceAmount = Math.max(0, confirmedBidAmount - amountPaid);

    res.status(200).json({
      success: true,
      message: "Initial payment verified and bid confirmed",
      bidId: bid._id,
      amountPaid,
      balanceAmount,
    });
  } catch (error) {
    next(errorHandler(500, "Verification failed: " + error.message));
  }
};

const verifyFinalPaymentAndCompleteEnquiry = async (req, res, next) => {
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
      .createHmac("sha256", process.env.RAZORPAY_TEST_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === "paid" || payment.phase !== "final") {
      return res.status(404).json({
        success: false,
        message: "Final payment not found or already processed",
      });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    payment.paidAt = new Date();
    await payment.save();

    const enquiry = await InspectionEnquiry.findById(payment.enquiry);
    if (!enquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }

    enquiry.paymentPhases = enquiry.paymentPhases.map((p) =>
      p.phase === "final" ? { ...p, status: "paid", razorpayPaymentId } : p
    );
    enquiry.status = "completed";
    enquiry.currentPhase = "completed";
    await enquiry.save();

    const bid = await Bid.findOne({
      enquiry: enquiry._id,
      status: "won",
    })
      .populate("inspector")
      .populate("enquiry");

    const customer = await Customer.findById(enquiry.customer);

    const paidPayments = await Payment.find({
      enquiry: enquiry._id,
      status: "paid",
    });
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const confirmedBidAmount =
      (bid && bid.customerViewAmount) || enquiry.inspectionBudget || 0;
    const remainingAfterFinal = Math.max(0, confirmedBidAmount - totalPaid);

    if (customer) {
      await sendFinalPaymentConfirmation(customer, bid, payment, {
        totalPaid,
        remainingAfterFinal,
      });
      await sendTeamPaymentNotification(customer, bid, payment, {
        totalPaid,
        remainingAfterFinal,
      });
    }

    res.status(200).json({
      success: true,
      message: "Final Payment verified and completed",
      enquiryId: enquiry._id,
    });
  } catch (error) {
    console.error("Final payment verification error:", error);
    next(
      errorHandler(500, "Final payment verification failed: " + error.message)
    );
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
      .createHmac("sha256", process.env.RAZORPAY_TEST_KEY_SECRET)
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
  createInitialOrderForEnquiry,
  webHooksController,
  verifyInitialPaymentAndConfirmBid,
  verifyQuickServicePayment,
  verifyFinalPaymentAndCompleteEnquiry,
  createFinalOrderForEnquiry,
};
