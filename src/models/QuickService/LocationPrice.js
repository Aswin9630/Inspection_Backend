const mongoose = require("mongoose");

const locationPriceSchema = new mongoose.Schema({
  country: { type: String, required: true },
  state: { type: String }, 
  state: { type: String }, // optional for international
  region: { type: String, required: true },
  currency: { type: String, enum: ["INR", "USD"], required: true },
  price: { type: Number, required: true },
});

locationPriceSchema.index({ country: 1, region: 1 });

module.exports = mongoose.model("LocationPrice", locationPriceSchema);
