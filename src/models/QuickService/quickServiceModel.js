const mongoose = require("mongoose");

const quickServiceLocationSchema = new mongoose.Schema({
  state: { type: String, required: true },
  location: { type: String, required: true },
  contactNumber: { type: String },
  inspectorName: { type: String },
  price: { type: Number, required: true },
}, { timestamps: true });

quickServiceLocationSchema.index({ location: 1 });

module.exports = mongoose.model("QuickServiceLocation", quickServiceLocationSchema);
