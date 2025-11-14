const mongoose = require("mongoose");

const quickServicePaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String, required: true },
  razorpay_signature: { type: String, required: true },
  amount: { type: Number, required: true }, // smallest currency unit (paise/cents)
  currency: { type: String, required: true },
  status: { type: String, default: "created" }, // created|captured|failed|refunded
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuickServicePayment", quickServicePaymentSchema);
