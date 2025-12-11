const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["customer"],
      default: "customer",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    countryCode: {
      type: String,
      required: true,
      match: [/^\+\d{1,4}$/, "Invalid country code"],
    },
    mobileNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid mobile number"],
    },
    address: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    publishRequirements: {
      type: Boolean, 
      default: false,
    },
    documents: {
      tradeLicense: {
        type: String,
        required: function () {
          return this.publishRequirements;
        },
      }, 
      importExportCertificate: {
        type: String,  
        required: function () {
          return this.publishRequirements;
        },
      },
    },
    panNumber: {
      type: String,
      default: null,
      match: [/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number"],
    },
    gstNumber: {
      type: String,
      default: null,
      match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, "Invalid GST number"],
    },
    iecNumber: { type: String, default: null },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified", "failed"],
      default: "none",
    },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    verificationExpires: { type: Date },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
