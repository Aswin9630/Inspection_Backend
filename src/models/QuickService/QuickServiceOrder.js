const mongoose = require("mongoose");

const quickServiceOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "QuickServicePayment", required: true },
  razorpay_order_id: String,
  status: { type: String, default: "paid" }, // paid | pending | cancelled | refunded
  currency: String,
  subtotal: Number, // main service total (in major units)
  tax: Number,      // tax amount (major units)
  total: Number,    // total amount charged (major units)
  items: [
    {
      cartItemId: { type: mongoose.Schema.Types.ObjectId, ref: "CartItem" },
      serviceType: String,
      country: String,
      location: String,
      commodity: String,
      volume: Number,
      unit: String,
      price: Number,
      currency: String,
      date: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuickServiceOrder", quickServiceOrderSchema);
