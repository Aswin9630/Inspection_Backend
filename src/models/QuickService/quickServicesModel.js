const mongoose = require("mongoose");

const quickServiceSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    default: "India",
  },
  commodityCategory: {
    type: String,
    required: true,
  },
  description: String,
  volume: String,

  inspectionDate: {
    type: Date,
    required: true,
  },
  inspectionTypes: {
    type: String,
    enum: ["Physical", "Chemical", "Both"],
    required: true,
  },
  inspectionService: {
    type: String,
    enum: ["PSI", "Loading", "Stuffing"],
    required: true,
  },

  contact: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },
  platformFee: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["draft", "pending", "paid", "cancelled","completed"],
    default: "draft",
  },
  urgencyLevel: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "High",
  },

  razorpayOrderId: String,
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
}, { timestamps: true });

module.exports = mongoose.model("QuickServiceRequest", quickServiceSchema);
