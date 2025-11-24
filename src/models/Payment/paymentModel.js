const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  enquiry: { type: mongoose.Schema.Types.ObjectId, ref: "InspectionEnquiry", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  bid: { type: mongoose.Schema.Types.ObjectId, ref: "Bid" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  phase: { type: String, enum: ["initial", "final"], required: true },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paymentMode: String,
  paidAt: Date,
  receiptId: String,
}, { timestamps: true });

paymentSchema.index({ enquiry: 1, phase: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
