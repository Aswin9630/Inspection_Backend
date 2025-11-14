const mongoose = require("mongoose");

const QuickServiceRequestOtherLocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      cartItemId: { type: mongoose.Schema.Types.ObjectId, ref: "CartItem" },
      serviceType: String,
      country: String,
      location: String,
      commodity: String,
      volume: Number,
      unit: String,
      date: String,
      raw: mongoose.Schema.Types.Mixed, 
      createdAt: { type: Date, default: Date.now },
    },
  ],
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuickServiceRequestOtherLocation", QuickServiceRequestOtherLocationSchema);
