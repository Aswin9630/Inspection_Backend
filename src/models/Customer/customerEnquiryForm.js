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
    inspectionLocation: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
    },
    urgencyLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Highest"],
      default: "Medium",
    },
    commodityCategory: {
      type: String,
      required: true,
    },
    subCommodity: {
      type: String,
    },
    volume: {
      type: String,
      required: true,
    },
    inspectionBudget: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
    },

    inspectionDate: {
      from: { type: Date },
      to: { type: Date },
    },

    inspectionTypes: {
      physical: { type: Boolean, default: false },
      chemical: { type: Boolean, default: false },
    },

    physicalParameters: {
      broken: Number,
      yellowKernel: Number,
      redKernel: Number,
      chalkyRice: Number,
      millingDegree: String,
      purity: Number,
      damageKernel: Number,
      paddyKernel: Number,
      liveInsects: String,
      averageGrainLength: Number,
    },

    chemicalParameters: [
      {
        type: [String],
        default:[]
      },
    ],

    additionalServices: [
      {
        type: String,
        enum: [
          "Pre-Shipment Inspection",
          "Loading Truck",
          "Stuffing Container",
          "Supervision of Process",
        ],
      },
    ],

    certifications: [
      {
        type: String,
        enum: ["COC", "ISO", "GAFTA", "FOSFE","NABCB","NABL"],
      },
    ],

    contact: {
      companyName: String,
      contactPersonName: String,
      email: {
        type: String,
        match: [/^\S+@\S+\.\S+$/, "Invalid email"],
      },
      phoneNumber: {
        type: String,
        match: [/^\d{6,15}$/, "Invalid phone number"],
      },
    },

    specialRequirements: {
      type: String,
      maxlength: 1000,
    },
    description: {
      type: String,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "cancelled", "completed"],
      default: "draft",
    },
    selectionSummary: {
      type: String,
    },
     currentPhase: { type: String, enum: ["initial", "final", "completed"], default: "initial" },
     paymentPhases: [
    {
      phase: { type: String, enum: ["initial", "inspection", "final"] },
      amount: Number,
      status: { type: String, enum: ["pending", "paid"], default: "pending" },
      razorpayOrderId: String,
      razorpayPaymentId: String,
    }
  ], 
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionEnquiry", inspectionEnquirySchema);
