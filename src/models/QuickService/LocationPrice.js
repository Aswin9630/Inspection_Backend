const mongoose = require("mongoose");

const locationPriceSchema = new mongoose.Schema({
  country: { type: String, required: true },
  state: { type: String }, // optional for international
  region: { type: String, required: true },
  currency: { type: String, enum: ["INR", "USD"], required: true },
  price: { type: Number, required: true },
});

module.exports = mongoose.model("LocationPrice", locationPriceSchema);
