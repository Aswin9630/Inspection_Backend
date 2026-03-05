const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    inspectionRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionRequest",
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionCompany",
      required: true
    },
    service: {
      type: String,
      enum: ["psi", "loading", "stuffing", "destination"],
      required: true
    },
    commodity: { type: String, required: true },
    location: {
      region: { type: String, required: true },
      city: { type: String, required: true }
    }, 
    inspectionDate: { type: Date, required: true },
    currency: { type: String, required: true },
    baseAmount: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    companyEarnings: { type: Number, required: true },
    platformRevenue: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    paidAt: { type: Date, required: true },
    companyPaidOut: { type: Boolean, default: false },
    companyPaidOutAt: { type: Date, default: null }
  },
  { timestamps: true } 
);
 
paymentTransactionSchema.index({ customer: 1, createdAt: -1 });
paymentTransactionSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema); 