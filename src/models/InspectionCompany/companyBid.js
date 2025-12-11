const mongoose = require("mongoose");

const companyBidSchema = new mongoose.Schema(
  {
    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionEnquiry",
      required: true
    },
    inspectionCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionCompany",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    customerViewAmount: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["active", "withdrawn", "won", "lost"],
      default: "active"
    }
  },
  { timestamps: true }
);

companyBidSchema.index({ enquiry: 1, inspectionCompany: 1 }, { unique: true });

module.exports = mongoose.model("CompanyBid", companyBidSchema);

