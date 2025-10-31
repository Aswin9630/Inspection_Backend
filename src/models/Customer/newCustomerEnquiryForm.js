const mongoose = require("mongoose");

const inspectionEnquirySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    confirmedBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },

    location: { 
      type: String,
      required: true,
      trim: true,
    },
    locationLat: {
      type: Number,
    },
    locationLng: {
      type: Number,
    },
    country: {
      type: String,
      required: true,
    },

    dateFrom: {
      type: Date,
    },
    dateTo: {
      type: Date,
    },

    urgency: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
    },
    commodity: {
      type: String,
    },

    volume: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
    },

    physicalInspection: { type: Boolean, default: false },
    chemicalInspection: { type: Boolean, default: false },

    physicalInspectionParameters: {
      type: {
        parameters: [
          {
            key: String,
            label: String,
            notes: String,
          },
        ],
        extra: [String],
      },
      default: {},
    },
    chemicalInspectionParameters: {
      type: {
        parameters: [
          {
            key: String,
            label: String,
            notes: String,
          },
        ],
        extra: [String],
      },
      default: {},
    }, 
 
    services: [{ type: String, enum:["pre-shipment", "loading", "stuffing"] }],
    certifications: [{ type: String, enum: ["COC", "ISO", "ECTN", "FOSFA", "NABCB", "NABL"] }],

    status: {
      type: String,
      enum: ["draft", "submitted", "cancelled", "completed"],
      default: "draft",
    },

    selectionSummary: { type: String },

    currentPhase: {
      type: String,
      enum: ["initial", "final", "completed"],
      default: "initial",
    },

    paymentPhases: [
      {
        phase: { type: String, enum: ["initial", "inspection", "final"] },
        amount: Number,
        status: { type: String, enum: ["pending", "paid"], default: "pending" },
        razorpayOrderId: String,
        razorpayPaymentId: String,
      },
    ],

    inspectionBudget: { type: Number, default: 0, min: 0, }, 
    platformFee: { type: Number, default: 0 },

  },
  { timestamps: true }
);

inspectionEnquirySchema.index({ customer: 1, status: 1, createdAt: -1 });
inspectionEnquirySchema.index({ location: "text", commodity: 1, category: 1 });

module.exports = mongoose.model("InspectionEnquiry", inspectionEnquirySchema);
