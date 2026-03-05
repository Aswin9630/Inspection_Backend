// const mongoose = require("mongoose");

// const inspectionRequestSchema = new mongoose.Schema({
//   customer: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Customer",
//     required: true
//   },
//   company: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "InspectionCompany",
//     required: true
//   },
//   service: {
//     type: String,
//     enum: ["psi", "loading", "stuffing", "destination"],
//     required: true
//   },
//   commodity: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   inspectionDate: {
//     type: Date,
//     required: true
//   },
//     location: {
//     region: { type: String, required: true },
//     city: { type: String, required: true }
//   },

//   pricing: {
//     currency: { type: String, enum: ["₹", "$"], required: true },
//     amount: { type: Number, required: true }
//   },
//   status: {
//     type: String,
//     enum: ["pending", "accepted", "rejected"],
//     default: "pending"
//   }
// }, { timestamps: true });

// module.exports = mongoose.model("InspectionRequest", inspectionRequestSchema);





const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "InspectionCompany", required: true },
    service: { type: String, enum: ["psi", "loading", "stuffing", "destination"], required: true },
    commodity: { type: String, required: true },
    inspectionDate: { type: Date, required: true },
    location: {
      region: { type: String, required: true },
      city: { type: String, required: true }
    },
    pricing: {
      currency: { type: String, required: true },
      amount: { type: Number, required: true },
      originalAmount: { type: Number, default: 0  }
    },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    payment: {
      status: { type: String, enum: ["pending", "completed"], default: "pending" },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      paidAt: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionRequest", schema);