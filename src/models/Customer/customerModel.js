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
      isVerified: {
        type: Boolean,
        default: false,
      },
      emailVerificationToken: {
        type: String,
      },
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
