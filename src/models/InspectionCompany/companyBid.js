const mongoose = require("mongoose");

const companyBidSchema = new mongoose.Schema(
  {
    enquiry: { type: mongoose.Schema.Types.ObjectId, ref: "InspectionEnquiry", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "InspectionCompany", required: true },
    amount: { type: Number, required: true },
    note: { type: String },
    customerViewAmount: { type: Number },
    status: { type: String, enum: ["active", "won", "lost", "withdrawn"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyBid", companyBidSchema);
