// const crypto = require("crypto");
// const Payment = require("../../models/Payment/paymentModel");
// const Customer = require("../../models/Customer/customerModel");
// const Bid = require("../../models/Inspector/bidModel");
// const CompanyBid = require("../../models/InspectionCompany/companyBid");
// const errorHandler = require("../../utils/errorHandler");
// const razorpayInstance = require("../../config/razorpay");
// const InspectionEnquiry = require("../../models/Customer/newCustomerEnquiryForm");
// const { 
//   validateWebhookSignature,
// } = require("razorpay/dist/utils/razorpay-utils");
// const QuickServiceRequest = require("../../models/QuickService/quickServicesModel");
// const sendCustomerPaymentConfirmation = require("../../utils/EmailServices/sendCustomerPaymentConfirmation");
// const sendTeamPaymentNotification = require("../../utils/EmailServices/sendTeamPaymentNotification");
// const sendQuickServiceCustomerConfirmation = require("../../utils/EmailServices/sendQuickServiceCustomerConfirmation");
// const sendQuickServiceTeamNotification = require("../../utils/EmailServices/sendQuickServiceTeamNotification");
// const sendFinalPaymentConfirmation = require("../../utils/EmailServices/sendFinalPaymentConfirmation");

// const isProd = process.env.NODE_ENV === "production";
// const KEY_ID = isProd ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
// const WEBHOOK_SECRET = isProd ? process.env.RAZORPAY_WEBHOOK_SECRET : process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
// const KEY_SECRET = isProd ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

// const createInitialOrderForEnquiry = async (req, res, next) => {
//   try {
//     if (req.user.role !== "customer") {
//       return next(errorHandler(403, "Only customers can initiate payment"));
//     }

//     const { enquiryId } = req.params;
//     const { amount } = req.body;

//     const enquiry = await InspectionEnquiry.findById(enquiryId);
//     const parsedAmount = Number(amount);

//     if (!parsedAmount || isNaN(parsedAmount || parsedAmount <= 0)) {
//       return next(errorHandler(400, "Valid bid amount is required"));
//     }

//     if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
//       return next(errorHandler(404, "Enquiry not found or unauthorized"));
//     }

//     if (enquiry.status !== "submitted") {
//       return next(errorHandler(400, "Payment already initiated or enquiry submitted"));
//     }

//     const customer = await Customer.findById(req.user._id).select("name email mobileNumber");
//     if (!customer) {
//       return next(errorHandler(404, "Customer profile not found"));
//     }

//     const bid = await Bid.findOne({ enquiry: enquiry._id, status: "active" });
//     if (!bid || !bid.customerViewAmount) {
//       return next(errorHandler(404, "Active bid with valid amount not found"));
//     }

//     const rawInitialAmount = bid.customerViewAmount * 0.3;
//     const initialAmount = Math.max(1, Math.round(rawInitialAmount));
//     const amountInPaise = initialAmount * 100;

//     const razorpayOrder = await razorpayInstance.orders.create({
//       amount: amountInPaise,
//       currency: enquiry.currency || "INR",
//       receipt: `receipt_${enquiryId}`,
//       payment_capture: 0,
//     });

//     // store bidId on payment so webhook can find the bid reliably
//     const payment = await Payment.create({
//       enquiry: enquiry._id,
//       customer: req.user._id,
//       amount: initialAmount,
//       currency: enquiry.currency,
//       status: "pending",
//       phase: "initial",
//       razorpayOrderId: razorpayOrder.id,
//       bid: bid._id, // NEW: add bid reference (ensure Payment schema allows it)
//     });

//     enquiry.paymentPhases.push({
//       phase: "initial",
//       amount: initialAmount,
//       status: "pending",
//       razorpayOrderId: razorpayOrder.id,
//     });
//     await enquiry.save();

//     res.status(201).json({
//       success: true,
//       message: "Razorpay order created",
//       order: razorpayOrder,
//       enquiryId: enquiry._id,
//       paymentId: payment._id,
//       keyId: KEY_ID,
//       customerDetails: {
//         name: customer.name,
//         email: customer.email,
//         mobileNumber: customer.mobileNumber,
//       },
//     });
//   } catch (error) {
//     console.error("Razorpay error:", error);
//     next(errorHandler(500, "Failed to create Razorpay order: " + (error.message || error)));
//   }
// };

// const webHooksController = async (req, res, next) => {
//   try {
//     const webhookSignature = req.headers["x-razorpay-signature"];
//     const rawBody = req.rawBody || JSON.stringify(req.body || {});

//     const isWebhookValid = validateWebhookSignature(rawBody, webhookSignature, WEBHOOK_SECRET);
//     if (!isWebhookValid) {
//       console.warn("Invalid webhook signature");
//       return next(errorHandler(400, "Webhook Signature is not valid"));
//     }

//     const event = req.body.event;
//     const paymentDetails = req.body.payload?.payment?.entity;

  
// if (event === "payment.captured" && paymentDetails) {
//   const orderId = paymentDetails.order_id;
//   const razorpayPaymentId = paymentDetails.id;

//   const payment = await Payment.findOne({ razorpayOrderId: orderId });
//   if (!payment) {
//     console.warn("webhook: payment record not found for order", orderId);
//     return res.status(404).json({ success: false, message: "Payment record not found" });
//   }

//   if (payment.status === "paid") {
//     console.info("webhook: payment already marked paid", payment._id);
//     return res.status(200).json({ success: true, message: "Already processed" });
//   }

//   payment.status = "paid";
//   payment.razorpayPaymentId = razorpayPaymentId;
//   payment.paymentMode = "razorpay";
//   payment.paidAt = new Date();
//   await payment.save();

//   let bid = null;
//   if (payment.bid) {
//     bid = await Bid.findById(payment.bid);
//   } else {
//     bid = await Bid.findOne({ enquiry: payment.enquiry, status: "active" });
//   }

//   if (!bid) {
//     console.warn("webhook: matching bid not found for payment", payment._id);
//     return res.status(200).json({ success: true, message: "Payment recorded but bid not found" });
//   }

//   bid.status = "won";
//   await bid.save();
//   await Bid.updateMany(
//     { enquiry: bid.enquiry._id, _id: { $ne: bid._id }, status: "active" },
//     { $set: { status: "lost" } }
//   );

//   const enquiry = await InspectionEnquiry.findById(payment.enquiry);
//   if (enquiry) {
//     enquiry.confirmedBid = bid._id;

//     if (payment.phase === "initial") {
//       enquiry.status = "submitted";
//       enquiry.currentPhase = "final";
//       enquiry.paymentPhases = enquiry.paymentPhases.map((p) =>
//         p.phase === "initial" ? { ...p, status: "paid", razorpayPaymentId } : p
//       );
//     } else if (payment.phase === "final") {
//       enquiry.status = "completed";
//       enquiry.currentPhase = "completed";
//       enquiry.paymentPhases = enquiry.paymentPhases.map((p) =>
//         p.phase === "final" ? { ...p, status: "paid", razorpayPaymentId } : p
//       );
//     }

//     await enquiry.save();
//   }

//   return res.status(200).json({ success: true, message: "Payment processed via webhook", bidId: bid._id });
// }


//     return res.status(200).json({ message: "Webhook received, no action taken" });
//   } catch (error) {
//     console.error("webhook error:", error);
//     return next(errorHandler(400, error.message || error));
//   }
// };

// const verifyInitialPaymentAndConfirmBid = async (req, res, next) => {
//   try {
//     const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature, bidId } = req.body;

//     if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !bidId) {
//       return next(errorHandler(400, "Missing required payment verification fields"));
//     }

// const generatedSignature = crypto
//   .createHmac("sha256", KEY_SECRET)
//   .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//   .digest("hex");

// if (generatedSignature !== razorpaySignature) {
//   return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
// }

// const payment = await Payment.findById(paymentId);
// if (!payment) {
//   return res.status(404).json({ success: false, message: "Payment record not found" });
// }

// if (payment.status === "paid") {
//   const confirmedBid = await Bid.findById(bidId);
//   const confirmedBidAmount = confirmedBid?.customerViewAmount ?? null;
//   const amountPaid = payment.amount;
//   const balanceAmount = confirmedBidAmount !== null ? Math.max(0, confirmedBidAmount - amountPaid) : null;

//   return res.status(200).json({
//     success: true,
//     message: "Payment already processed",
//     amountPaid,
//     balanceAmount,
//   });
// }

// if (payment.phase !== "initial") {
//   return res.status(400).json({ success: false, message: "Payment phase mismatch" });
// }

// payment.status = "paid";
// payment.razorpayPaymentId = razorpayPaymentId;
// payment.paymentMode = "razorpay";
// payment.paidAt = new Date();
// await payment.save();

// const bid = await Bid.findById(bidId).populate({ path: "enquiry", populate: { path: "customer", model: "Customer" } }).populate("inspector");
// if (!bid || bid.status !== "active") {
//   return res.status(404).json({ success: false, message: "Bid not found or already confirmed" });
// }

// bid.status = "won";
// await bid.save();
// await Bid.updateMany(
//   { enquiry: bid.enquiry._id, _id: { $ne: bid._id }, status: "active" },
//   { $set: { status: "lost" } }
// );

// bid.enquiry.confirmedBid = bid._id;
// bid.enquiry.status = "submitted";
// bid.enquiry.currentPhase = "final";
// bid.enquiry.paymentPhases = bid.enquiry.paymentPhases.map((p) =>
//   p.phase === "initial" ? { ...p, status: "paid", razorpayPaymentId } : p
// );
// await bid.enquiry.save();



//     const customer = bid.enquiry.customer;
//     if (customer) {
//       await sendCustomerPaymentConfirmation(customer, bid, payment);
//       await sendTeamPaymentNotification(customer, bid, payment);
//     }

//     const confirmedBidAmount = bid.customerViewAmount;
//     const amountPaid = payment.amount;
//     const balanceAmount = Math.max(0, confirmedBidAmount - amountPaid);

//     res.status(200).json({
//       success: true,
//       message: "Initial payment verified and bid confirmed",
//       bidId: bid._id,
//       amountPaid,
//       balanceAmount,
//     });
//   } catch (error) {
//     console.error("verifyInitialPayment error:", error);
//     next(errorHandler(500, "Verification failed: " + (error.message || error)));
//   }
// };


// const createFinalOrderForEnquiry = async (req, res, next) => {
//   try {
//     if (req.user.role !== "customer") {
//       return next(errorHandler(403, "Only customers can initiate payment"));
//     }

//     const { enquiryId } = req.params;
//     const enquiry = await InspectionEnquiry.findById(enquiryId);
//     if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
//       return next(errorHandler(404, "Enquiry not found or unauthorized"));
//     }

//     if (enquiry.status !== "submitted" || enquiry.currentPhase !== "final") {
//       return next(errorHandler(400, "Final payment not allowed at this phase"));
//     }

//     const confirmedBid = await Bid.findById(enquiry.confirmedBid);
//     if (!confirmedBid || !confirmedBid.customerViewAmount) {
//       return next(errorHandler(404, "Confirmed bid not found"));
//     }

//     const finalAmount = Math.max(
//       1,
//       Math.round(confirmedBid.customerViewAmount * 0.7)
//     );

//     const amountInPaise = finalAmount * 100;

//     const existingFinalPayment = await Payment.findOne({
//       enquiry: enquiry._id,
//       phase: "final",
//       status: "paid",
//     });

//     if (existingFinalPayment) {
//       return next(
//         errorHandler(400, "Final payment already initiated or completed")
//       );
//     }

//     await Payment.deleteMany({
//       enquiry: enquiry._id,
//       phase: "final",
//       status: "pending",
//     });

//     const razorpayOrder = await razorpayInstance.orders.create({
//       amount: amountInPaise,
//       currency: enquiry.currency,
//       receipt: `receipt_final_${enquiryId}`,
//       payment_capture: 0,
//     });

//     const payment = await Payment.create({
//       enquiry: enquiry._id,
//       customer: req.user._id,
//       amount: finalAmount,
//       currency: enquiry.currency,
//       status: "pending",
//       phase: "final",
//       razorpayOrderId: razorpayOrder.id,
//     });

//     enquiry.paymentPhases.push({
//       phase: "final",
//       amount: finalAmount,
//       status: "pending",
//       razorpayOrderId: razorpayOrder.id,
//     });

//     await enquiry.save();

//     const customer = await Customer.findById(req.user._id).select(
//       "name email mobileNumber"
//     );

//     res.status(201).json({
//       success: true,
//       message: "Final Razorpay order created",
//       order: razorpayOrder,
//       enquiryId: enquiry._id,
//       paymentId: payment._id,
//       keyId: KEY_ID,
//       customerDetails: {
//         name: customer.name,
//         email: customer.email,
//         mobileNumber: customer.mobileNumber,
//       },
//     });
//   } catch (error) {
//     console.error("Final Razorpay error:", error);
//     next(
//       errorHandler(
//         500,
//         "Failed to create final Razorpay order: " + error.message
//       )
//     );
//   }
// };

// const verifyFinalPaymentAndCompleteEnquiry = async (req, res, next) => {
//   try {
//     const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
//       req.body;

//     if (
//       !paymentId ||
//       !razorpayPaymentId ||
//       !razorpayOrderId ||
//       !razorpaySignature
//     ) {
//       return next(
//         errorHandler(400, "Missing required payment verification fields")
//       );
//     }

//     const generatedSignature = crypto
//       .createHmac("sha256", KEY_SECRET)
//       .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//       .digest("hex");

//     if (generatedSignature !== razorpaySignature) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid Razorpay signature" });
//     }

//     const payment = await Payment.findById(paymentId);
//     if (!payment || payment.status === "paid" || payment.phase !== "final") {
//       return res.status(404).json({
//         success: false,
//         message: "Final payment not found or already processed",
//       });
//     }

//     payment.status = "paid";
//     payment.razorpayPaymentId = razorpayPaymentId;
//     payment.paymentMode = "razorpay";
//     payment.paidAt = new Date();
//     await payment.save();

//     const enquiry = await InspectionEnquiry.findById(payment.enquiry);
//     if (!enquiry) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Enquiry not found" });
//     }

//     enquiry.paymentPhases = enquiry.paymentPhases.map((p) =>
//       p.phase === "final" ? { ...p, status: "paid", razorpayPaymentId } : p
//     );
//     enquiry.status = "completed";
//     enquiry.currentPhase = "completed";
//     await enquiry.save();

//     const bid = await Bid.findOne({
//       enquiry: enquiry._id,
//       status: "won",
//     })
//       .populate("inspector")
//       .populate("enquiry");

//     const customer = await Customer.findById(enquiry.customer);

//     const paidPayments = await Payment.find({
//       enquiry: enquiry._id,
//       status: "paid",
//     });
//     const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
//     const confirmedBidAmount =
//       (bid && bid.customerViewAmount) || enquiry.inspectionBudget || 0;
//     const remainingAfterFinal = Math.max(0, confirmedBidAmount - totalPaid);

//     if (customer) {
//       await sendFinalPaymentConfirmation(customer, bid, payment, {
//         totalPaid,
//         remainingAfterFinal,
//       });
//       await sendTeamPaymentNotification(customer, bid, payment, {
//         totalPaid,
//         remainingAfterFinal,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Final Payment verified and completed",
//       enquiryId: enquiry._id,
//     });
//   } catch (error) {
//     console.error("Final payment verification error:", error);
//     next(
//       errorHandler(500, "Final payment verification failed: " + error.message)
//     );
//   }
// };

// const verifyQuickServicePayment = async (req, res, next) => {
//   try {
//     const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
//       req.body;

//     if (
//       !paymentId ||
//       !razorpayPaymentId ||
//       !razorpayOrderId ||
//       !razorpaySignature
//     ) {
//       return next(
//         errorHandler(400, "Missing required payment verification fields")
//       );
//     }

//     const generatedSignature = crypto
//       .createHmac("sha256",KEY_SECRET)
//       .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//       .digest("hex");

//     if (generatedSignature !== razorpaySignature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Razorpay signature",
//       });
//     }

//     const payment = await Payment.findById(paymentId);
//     if (!payment || payment.status === "paid") {
//       return res.status(404).json({
//         success: false,
//         message: "Payment not found or already processed",
//       });
//     }

//     payment.status = "paid";
//     payment.razorpayPaymentId = razorpayPaymentId;
//     payment.paymentMode = "razorpay";
//     await payment.save();

//     const quickRequest = await QuickServiceRequest.findById(payment.enquiry);
//     if (!quickRequest) {
//       return res.status(404).json({
//         success: false,
//         message: "Quick service request not found",
//       });
//     }

//     quickRequest.status = "paid";
//     await quickRequest.save();

//     await sendQuickServiceCustomerConfirmation(
//       quickRequest.customer,
//       quickRequest,
//       payment
//     );
//     await sendQuickServiceTeamNotification(
//       quickRequest.customer,
//       quickRequest,
//       payment
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Quick service payment verified",
//       requestId: quickRequest._id,
//     });
//   } catch (error) {
//     next(
//       errorHandler(500, "Quick service verification failed: " + error.message)
//     );
//   }
// };

// module.exports = {
//   createInitialOrderForEnquiry,
//   webHooksController,
//   verifyInitialPaymentAndConfirmBid,
//   verifyQuickServicePayment,
//   verifyFinalPaymentAndCompleteEnquiry,
//   createFinalOrderForEnquiry,
// };



// controllers/payment/paymentController.js
const crypto = require("crypto");
const Payment = require("../../models/Payment/paymentModel");
const Customer = require("../../models/Customer/customerModel");
const Bid = require("../../models/Inspector/bidModel");
const CompanyBid = require("../../models/InspectionCompany/companyBid");
const InspectionEnquiry = require("../../models/Customer/newCustomerEnquiryForm");
const errorHandler = require("../../utils/errorHandler");
const razorpayInstance = require("../../config/razorpay");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

const sendCustomerPaymentConfirmation = require("../../utils/EmailServices/sendCustomerPaymentConfirmation");
const sendTeamPaymentNotification = require("../../utils/EmailServices/sendTeamPaymentNotification");
const sendFinalPaymentConfirmation = require("../../utils/EmailServices/sendFinalPaymentConfirmation");
const sendQuickServiceCustomerConfirmation = require("../../utils/EmailServices/sendQuickServiceCustomerConfirmation");
const sendQuickServiceTeamNotification = require("../../utils/EmailServices/sendQuickServiceTeamNotification");
const QuickServiceRequest = require("../../models/QuickService/quickServicesModel");

const isProd = process.env.NODE_ENV === "production";
const KEY_ID = isProd ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
const WEBHOOK_SECRET = isProd ? process.env.RAZORPAY_WEBHOOK_SECRET : process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
const KEY_SECRET = isProd ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;


async function findBidById(bidId) {
  if (!bidId) return { bid: null, type: null };
  let bid = await Bid.findById(bidId).populate("enquiry").populate("inspector");
  if (bid) return { bid, type: "inspector" };
  bid = await CompanyBid.findById(bidId).populate("enquiry").populate("inspectionCompany");
  if (bid) return { bid, type: "company" };
  return { bid: null, type: null };
}


async function markBidWonAndOthersLost(bid, type) {
  if (!bid) return;

  if (type === "inspector") {
    bid.status = "won";
    await bid.save();
    // mark other inspector bids lost
    await Bid.updateMany(
      { enquiry: bid.enquiry._id, _id: { $ne: bid._id }, status: "active" },
      { $set: { status: "lost" } }
    );
    // mark all company bids for this enquiry lost
    await CompanyBid.updateMany(
      { enquiry: bid.enquiry._id, status: "active" },
      { $set: { status: "lost" } }
    );
  } else if (type === "company") {
    bid.status = "won";
    await bid.save();
    // mark other company bids lost
    await CompanyBid.updateMany(
      { enquiry: bid.enquiry._id, _id: { $ne: bid._id }, status: "active" },
      { $set: { status: "lost" } }
    );
    // mark all inspector bids for this enquiry lost
    await Bid.updateMany(
      { enquiry: bid.enquiry._id, status: "active" },
      { $set: { status: "lost" } }
    );
  }
}


const createInitialOrderForEnquiry = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can initiate payment"));
    }

    const { enquiryId } = req.params;
    const { amount ,bidId} = req.body; // optional client-provided amount (server will validate against bid)
    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(404, "Enquiry not found or unauthorized"));
    }

    // find an active bid (inspector or company) if not provided by client
    // prefer inspector active bid if multiple exist? We'll pick the active bid referenced by Payment flow:
    // If client wants to pay for a specific bid, they should pass bidId in body. But existing flow expects server to find active bid.
    // We'll find the active bid with the lowest customerViewAmount if multiple exist.
    const inspectorActive = await Bid.find({ enquiry: enquiry._id, status: "active" }).sort({ customerViewAmount: 1 }).limit(1);
    const companyActive = await CompanyBid.find({ enquiry: enquiry._id, status: "active" }).sort({ customerViewAmount: 1 }).limit(1);

    // choose the lowest among available active bids
    let chosenBid = null;
    let chosenType = null;
     if (bidId) {
      const inspectorBid = await Bid.findById(bidId);
      if (inspectorBid && inspectorBid.enquiry.toString() === enquiry._id.toString() && inspectorBid.status === "active") {
        chosenBid = inspectorBid;
        chosenType = "inspector";
      } else {
        const companyBid = await CompanyBid.findById(bidId);
        if (companyBid && companyBid.enquiry.toString() === enquiry._id.toString() && companyBid.status === "active") {
          chosenBid = companyBid;
          chosenType = "company";
        }
      }
    }

    if (!chosenBid) {
      const inspectorActive = await Bid.find({ enquiry: enquiry._id, status: "active" }).sort({ customerViewAmount: 1 }).limit(1);
      const companyActive = await CompanyBid.find({ enquiry: enquiry._id, status: "active" }).sort({ customerViewAmount: 1 }).limit(1);

      if (inspectorActive.length && companyActive.length) {
        const i = inspectorActive[0];
        const c = companyActive[0];
        if ((i.customerViewAmount || Infinity) <= (c.customerViewAmount || Infinity)) {
          chosenBid = i;
          chosenType = "inspector";
        } else {
          chosenBid = c;
          chosenType = "company";
        }
      } else if (inspectorActive.length) {
        chosenBid = inspectorActive[0];
        chosenType = "inspector";
      } else if (companyActive.length) {
        chosenBid = companyActive[0];
        chosenType = "company";
      }
    }

    if (!chosenBid || !chosenBid.customerViewAmount) {
      return next(errorHandler(404, "Active bid with valid amount not found"));
    }

    // compute initial amount (30% of customerViewAmount) - server authoritative
    const rawInitialAmount = chosenBid.customerViewAmount * 0.3;
    const initialAmount = Math.max(1, Math.round(rawInitialAmount));
    const amountInPaise = initialAmount * 100;

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: enquiry.currency || "INR",
      receipt:`receipt_${enquiryId}`,
      payment_capture: 0,
    });

    // create Payment record and attach bid reference and bidder type
    const payment = await Payment.create({
      enquiry: enquiry._id,
      customer: req.user._id,
      amount: initialAmount,
      currency: enquiry.currency || "INR",
      status: "pending",
      phase: "initial",
      razorpayOrderId: razorpayOrder.id,
      bid: chosenBid._id,
      bidderType: chosenType, // custom field to indicate inspector/company
    });

    // push payment phase into enquiry
    enquiry.paymentPhases = enquiry.paymentPhases || [];
    enquiry.paymentPhases.push({
      phase: "initial",
      amount: initialAmount,
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
    });
    await enquiry.save();

    const customer = await Customer.findById(req.user._id).select("name email mobileNumber");

    res.status(201).json({
      success: true,
      message: "Razorpay order created",
      order: razorpayOrder,
      enquiryId: enquiry._id,
      paymentId: payment._id,
      keyId: KEY_ID,
      customerDetails: {
        name: customer?.name || "",
        email: customer?.email || "",
        mobileNumber: customer?.mobileNumber || "",
      },
    });
  } catch (error) {
    console.error("createInitialOrderForEnquiry error:", error);
    next(errorHandler(500, "Failed to create Razorpay order: " + (error.message || error)));
  }
};


const verifyInitialPaymentAndConfirmBid = async (req, res, next) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature, bidId } = req.body;

    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !bidId) {
      return next(errorHandler(400, "Missing required payment verification fields"));
    }

    const generatedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    if (payment.status === "paid") {
      const { bid, type } = await findBidById(payment.bid || bidId);
      const confirmedBidAmount = bid?.customerViewAmount ?? null;
      const amountPaid = payment.amount;
      const balanceAmount = confirmedBidAmount !== null ? Math.max(0, confirmedBidAmount - amountPaid) : null;

      return res.status(200).json({
        success: true,
        message: "Payment already processed",
        amountPaid,
        balanceAmount,
      });
    }

    if (payment.phase !== "initial") {
      return res.status(400).json({ success: false, message: "Payment phase mismatch" });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    payment.paidAt = new Date();
    await payment.save();

    const { bid, type } = await findBidById(bidId);
    if (!bid) {
      return res.status(404).json({ success: false, message: "Bid not found" });
    }

    if (bid.status !== "active") {
      return res.status(400).json({ success: false, message: "Bid not active or already processed" });
    }

    await markBidWonAndOthersLost(bid, type);

    const enquiry = await InspectionEnquiry.findById(bid.enquiry._id);
    if (enquiry) {
      enquiry.confirmedBid = bid._id;
      enquiry.status = "submitted";
      enquiry.currentPhase = "final";
      enquiry.paymentPhases = (enquiry.paymentPhases || []).map((p) =>
        p.phase === "initial" ? { ...p, status: "paid", razorpayPaymentId } : p
      );
      await enquiry.save();
    }

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
    console.error("verifyInitialPaymentAndConfirmBid error:", error);
    next(errorHandler(500, "Verification failed: " + (error.message || error)));
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

    // find the confirmed bid (could be inspector or company)
    const confirmedBidId = enquiry.confirmedBid;
    const { bid: confirmedBid, type } = await findBidById(confirmedBidId);

    if (!confirmedBid || !confirmedBid.customerViewAmount) {
      return next(errorHandler(404, "Confirmed bid not found"));
    }

    const finalAmount = Math.max(1, Math.round(confirmedBid.customerViewAmount * 0.7));
    const amountInPaise = finalAmount * 100;

    // prevent duplicate final payments
    const existingFinalPayment = await Payment.findOne({
      enquiry: enquiry._id,
      phase: "final",
      status: "paid",
    });
    if (existingFinalPayment) {
      return next(errorHandler(400, "Final payment already initiated or completed"));
    }

    // remove any pending final payments
    await Payment.deleteMany({
      enquiry: enquiry._id,
      phase: "final",
      status: "pending",
    });

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: enquiry.currency || "INR",
       receipt:`receipt_${enquiryId}`,
      payment_capture: 0,
    });

    const payment = await Payment.create({
      enquiry: enquiry._id,
      customer: req.user._id,
      amount: finalAmount,
      currency: enquiry.currency || "INR",
      status: "pending",
      phase: "final",
      razorpayOrderId: razorpayOrder.id,
      bid: confirmedBidId,
      bidderType: type,
    });

    enquiry.paymentPhases = enquiry.paymentPhases || [];
    enquiry.paymentPhases.push({
      phase: "final",
      amount: finalAmount,
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
    });
    await enquiry.save();

    const customer = await Customer.findById(req.user._id).select("name email mobileNumber");

    res.status(201).json({
      success: true,
      message: "Final Razorpay order created",
      order: razorpayOrder,
      enquiryId: enquiry._id,
      paymentId: payment._id,
      keyId: KEY_ID,
      customerDetails: {
        name: customer?.name || "",
        email: customer?.email || "",
        mobileNumber: customer?.mobileNumber || "",
      },
    });
  } catch (error) {
    console.error("createFinalOrderForEnquiry error:", error);
    next(errorHandler(500, "Failed to create final Razorpay order: " + (error.message || error)));
  }
};


const verifyFinalPaymentAndCompleteEnquiry = async (req, res, next) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return next(errorHandler(400, "Missing required payment verification fields"));
    }

    const generatedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === "paid" || payment.phase !== "final") {
      return res.status(404).json({ success: false, message: "Final payment not found or already processed" });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    payment.paidAt = new Date();
    await payment.save();

    const enquiry = await InspectionEnquiry.findById(payment.enquiry);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    enquiry.paymentPhases = (enquiry.paymentPhases || []).map((p) =>
      p.phase === "final" ? { ...p, status: "paid", razorpayPaymentId } : p
    );
    enquiry.status = "completed";
    enquiry.currentPhase = "completed";
    await enquiry.save();

    const { bid } = await findBidById(enquiry.confirmedBid);
    const customer = await Customer.findById(enquiry.customer);

    const paidPayments = await Payment.find({ enquiry: enquiry._id, status: "paid" });
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const confirmedBidAmount = (bid && bid.customerViewAmount) || enquiry.inspectionBudget || 0;
    const remainingAfterFinal = Math.max(0, confirmedBidAmount - totalPaid);

    try {
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
    } catch (notifyErr) {
      console.error("Notification error after final payment:", notifyErr);
    }

    res.status(200).json({
      success: true,
      message: "Final Payment verified and completed",
      enquiryId: enquiry._id,
    });
  } catch (error) {
    console.error("verifyFinalPaymentAndCompleteEnquiry error:", error);
    next(errorHandler(500, "Final payment verification failed: " + (error.message || error)));
  }
};


const webHooksController = async (req, res, next) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    const isWebhookValid = validateWebhookSignature(rawBody, webhookSignature, WEBHOOK_SECRET);
    if (!isWebhookValid) {
      console.warn("Invalid webhook signature");
      return next(errorHandler(400, "Webhook Signature is not valid"));
    }

    const event = req.body.event;
    const paymentDetails = req.body.payload?.payment?.entity;

    if (event === "payment.captured" && paymentDetails) {
      const orderId = paymentDetails.order_id;
      const razorpayPaymentId = paymentDetails.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        console.warn("webhook: payment record not found for order", orderId);
        return res.status(404).json({ success: false, message: "Payment record not found" });
      }

      if (payment.status === "paid") {
        console.info("webhook: payment already marked paid", payment._id);
        return res.status(200).json({ success: true, message: "Already processed" });
      }

      // mark payment paid
      payment.status = "paid";
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.paymentMode = "razorpay";
      payment.paidAt = new Date();
      await payment.save();

      // find the bid referenced by payment (could be inspector or company)
      let bid = null;
      let bidType = null;
      if (payment.bid) {
        const inspectorBid = await Bid.findById(payment.bid);
        if (inspectorBid) {
          bid = inspectorBid;
          bidType = "inspector";
        } else {
          const companyBid = await CompanyBid.findById(payment.bid);
          if (companyBid) {
            bid = companyBid;
            bidType = "company";
          }
        }
      }

      // fallback: if payment.bid not set, try to find any active bid for the enquiry
      if (!bid) {
        const inspectorBid = await Bid.findOne({ enquiry: payment.enquiry, status: "active" }).sort({ customerViewAmount: 1 });
        const companyBid = await CompanyBid.findOne({ enquiry: payment.enquiry, status: "active" }).sort({ customerViewAmount: 1 });
        if (inspectorBid && companyBid) {
          // choose lowest
          if ((inspectorBid.customerViewAmount || Infinity) <= (companyBid.customerViewAmount || Infinity)) {
            bid = inspectorBid;
            bidType = "inspector";
          } else {
            bid = companyBid;
            bidType = "company";
          }
        } else if (inspectorBid) {
          bid = inspectorBid;
          bidType = "inspector";
        } else if (companyBid) {
          bid = companyBid;
          bidType = "company";
        }
      }

      if (!bid) {
        console.warn("webhook: matching bid not found for payment", payment._id);
        return res.status(200).json({ success: true, message: "Payment recorded but bid not found" });
      }

      // mark bid won and others lost
      await markBidWonAndOthersLost(bid, bidType);

      // update enquiry
      const enquiry = await InspectionEnquiry.findById(payment.enquiry);
      if (enquiry) {
        enquiry.confirmedBid = bid._id;
        if (payment.phase === "initial") {
          enquiry.status = "submitted";
          enquiry.currentPhase = "final";
          enquiry.paymentPhases = (enquiry.paymentPhases || []).map((p) =>
            p.phase === "initial" ? { ...p, status: "paid", razorpayPaymentId } : p
          );
        } else if (payment.phase === "final") {
          enquiry.status = "completed";
          enquiry.currentPhase = "completed";
          enquiry.paymentPhases = (enquiry.paymentPhases || []).map((p) =>
            p.phase === "final" ? { ...p, status: "paid", razorpayPaymentId } : p
          );
        }
        await enquiry.save();
      }

      return res.status(200).json({ success: true, message: "Payment processed via webhook", bidId: bid._id });
    }

    return res.status(200).json({ message: "Webhook received, no action taken" });
  } catch (error) {
    console.error("webhook error:", error);
    return next(errorHandler(400, error.message || error));
  }
};


const verifyQuickServicePayment = async (req, res, next) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return next(errorHandler(400, "Missing required payment verification fields"));
    }

    const generatedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === "paid") {
      return res.status(404).json({ success: false, message: "Payment not found or already processed" });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paymentMode = "razorpay";
    await payment.save();

    const quickRequest = await QuickServiceRequest.findById(payment.enquiry);
    if (!quickRequest) {
      return res.status(404).json({ success: false, message: "Quick service request not found" });
    }

    quickRequest.status = "paid";
    await quickRequest.save();

    await sendQuickServiceCustomerConfirmation(quickRequest.customer, quickRequest, payment);
    await sendQuickServiceTeamNotification(quickRequest.customer, quickRequest, payment);

    return res.status(200).json({ success: true, message: "Quick service payment verified", requestId: quickRequest._id });
  } catch (error) {
    console.error("verifyQuickServicePayment error:", error);
    next(errorHandler(500, "Quick service verification failed: " + (error.message || error)));
  }
};

module.exports = {
  createInitialOrderForEnquiry,
  webHooksController,
  verifyInitialPaymentAndConfirmBid,
  verifyQuickServicePayment,
  createFinalOrderForEnquiry,
  verifyFinalPaymentAndCompleteEnquiry,
};
