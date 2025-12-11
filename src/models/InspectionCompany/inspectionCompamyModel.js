const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    incorporationCertificate: { type: String, required: true },
    businessLicense: { type: String, default: null },
  },
  { _id: false }
);

const inspectionCompanySchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["inspection_company"],
      default: "inspection_company",
      required: true
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    phoneNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid phone number"]
    },

    mobileNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid mobile number"]
    },

    companyEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"]
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z]+$/, "Only alphabets allowed"]
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z]+$/, "Only alphabets allowed"]
    },

    licenseNumber: {
      type: String,
      required: function () {
        return this.publishRequirements;
      },
      minlength: 16,
      maxlength: 64,
      match: [/^[A-Za-z0-9-\s]+$/, "License uses letters, numbers, spaces, or hyphens"]
    },

    websiteUrl: {
      type: String,
      default: null,
      match: [
        /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\/\w .-]*)*\/?$/,
        "Invalid URL"
      ]
    },

    publishRequirements: {
      type: Boolean,
      default: false
    },

    certificates: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 5,
        message: "Select 1–5 certificates"
      }
    },

    documents: {
      type: documentSchema,
      required: function () {
        return this.publishRequirements;
      }
    },

    gstNumber: { type: String, default: null },
    panNumber: {
      type: String,
      default: null,
      match: [/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number"]
    },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified", "failed"],
      default: "none"
    },

    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    verificationExpires: { type: Date },

    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionCompany", inspectionCompanySchema);
