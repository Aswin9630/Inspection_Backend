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
        default:null,
        // required: function () {
          // return this.publishRequirements;
        // },
      }, 
      importExportCertificate: {
        type: String, 
        default:null, 
        // required: function () {
          // return this.publishRequirements;
        // },
      },
    },
    gstNumber: {
      type: String,
      unique: true, 
      sparse:true,
      default: null,
      match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, "Invalid GST number"],
    },
  gstVerified: {
      type: Boolean,
      default: false,
    },

    gstDetails: {
  legalName: String,
  tradeName: String,
  gstType: String,
  registrationDate: String,
  state: String,
  lastVerifiedAt: Date,
  status:String,
},
 
    isVerified: { type: Boolean, default: false }, 
    emailVerificationToken: { type: String },
    verificationExpires: { type: Date },

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
