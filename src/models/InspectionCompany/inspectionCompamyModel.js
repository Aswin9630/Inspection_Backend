const mongoose = require("mongoose")
const inspectionCompanySchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["inspection company"],
      default: "inspection company",
      required: true,
    },
    companyType: {
      type: String,
      enum: ["indian", "international"],
      required: true,
    },
    contactPersonName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    companyEmail: {
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
    companyPhoneNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid phone number"],
    },
    mobileNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid mobile number"],
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    businessLicenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    companyAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/[\w\-\.]+\.\w{2,}(\/\S*)?$/, "Invalid website URL"],
    },
    yearEstablished: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
      required: true,
    },
    employeeCount: {
      type: String,
      enum: ["1-10", "11-50", "51-100", "101-500", "501-1000"],
      required: true,
    },
    servicesOffered: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    gstNumber: {
      type: String,
      required: function () {
        return this.companyType === "indian";
      },
      match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, "Invalid GST number"],
    },
    panNumber: {
      type: String,
      required: function () {
        return this.companyType === "indian";
      },
      match: [/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number"],
    },
    cinNumber: {
      type: String,
      required: function () {
        return this.companyType === "indian";
      },
      match: [/^[A-Z]{1}\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, "Invalid CIN number"],
    },
    msmeNumber: {
      type: String,
      trim: true,
    },
    documents: {
      businessLicense: {
        type: String,
        required: true,
      },
      incorporationCertificate: {
        type: String,
        required: true,
      },
      taxCertificate: {
        type: String,
      },
      insuranceDocument: {
        type: String,
        required: true,
      },
    },
     resetPasswordToken: String,
    resetPasswordExpire: Date,
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    verificationExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionCompany", inspectionCompanySchema);
