const mongoose = require("mongoose");

const inspectorsInspectorsList = new mongoose.Schema({
  state: { type: String, required: true },
  location: { type: String, required: true },
  contactNumber: { type: String },
  inspectorName: { type: String },
  price: { type: Number, required: true },
}, { timestamps: true });

inspectorsInspectorsList.index({ location: 1 });

module.exports = mongoose.model("InspectorsList", inspectorsInspectorsList);
