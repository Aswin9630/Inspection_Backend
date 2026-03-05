const mongoose = require("mongoose");


const availabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    required: true
  },
  from: { type: String, required: true },
  to: { type: String, required: true }
}, { _id: false });


const serviceItemSchema = new mongoose.Schema({
  confirmed: {
    type: String,
    required: true
  }
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  psi: { type: serviceItemSchema, required: true },
  loading: { type: serviceItemSchema, required: true },
  stuffing: { type: serviceItemSchema, required: true }
}, { _id: false });
 

const locationSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
    trim: true
  },
  services: {
    type: serviceSchema,
    required: true
  },
  availability: {
    type: [availabilitySchema],
    validate: v => v.length > 0
  }
}, { _id: true });


const regionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  locations: {
    type: [locationSchema],
    validate: v => v.length > 0
  }
}, { _id: true });


const quickInspectionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InspectionCompany",
    required: true
  },

  coverageType: {
    type: String,
    enum: ["india", "intl"],
    required: true
  },

  indiaRegions: [regionSchema],
  intlRegions: [regionSchema],

  commodities: {
    type: [String],
    validate: v => v.length > 0
  },

  description: {
    type: String,
    required: true,
    trim: true
  }

}, { timestamps: true });

module.exports = mongoose.model("QuickInspection", quickInspectionSchema);
