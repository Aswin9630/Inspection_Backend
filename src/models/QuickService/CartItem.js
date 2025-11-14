const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceType: { type: String, enum: ["PSI", "LOADING", "STUFFING", "DESTINATION"], required: true },
  country: String,
  location: String,
  commodity: String,
  volume: Number,
  unit: String,
    date: { type: String, default: "" }, 
  price: { type: Number, default: 0 },
  currency: String,
    isEnquiry: { type: Boolean, default: false },      
  enquiryRaised: { type: Boolean, default: false },
  status: { type: String, default: "pending" },
});

module.exports = mongoose.model("CartItem", cartItemSchema);
