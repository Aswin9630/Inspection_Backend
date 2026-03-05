// const mongoose = require("mongoose");

// const documentSchema = new mongoose.Schema(
//   {
//     incorporationCertificate: { type: String, required: true },
//     businessLicense: { type: String, default: null },
//   },
//   { _id: false }
// );

// const inspectionCompanySchema = new mongoose.Schema(
//   {
//     role: {
//       type: String,
//       enum: ["inspection_company"],
//       default: "inspection_company",
//       required: true
//     },

//     companyName: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 2,
//       maxlength: 100
//     },

//     phoneNumber: {
//       type: String,
//       required: true,
//       match: [/^\d{6,15}$/, "Invalid phone number"]
//     },

//     mobileNumber: {
//       type: String,
//       required: true,
//       match: [/^\d{6,15}$/, "Invalid mobile number"]
//     },

//     companyEmail: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: [/^\S+@\S+\.\S+$/, "Invalid email"]
//     },

//     password: {
//       type: String,
//       required: true,
//       minlength: 8,
//       select: false
//     }, 

//     firstName: {
//       type: String,
//       required: true,
//       trim: true,
//       match: [/^[A-Za-z]+$/, "Only alphabets allowed"]
//     },

//     lastName: {
//       type: String,
//       required: true,
//       trim: true,
//       match: [/^[A-Za-z]+$/, "Only alphabets allowed"]
//     },

//     licenseNumber: {
//       type: String,
//       required: function () {
//         return this.publishRequirements;
//       },
//       minlength: 6,
//       maxlength: 64,
//       match: [/^[A-Za-z0-9-\s]+$/, "License uses letters, numbers, spaces, or hyphens"]
//     },

//     websiteUrl: {
//       type: String,
//       default: null,
//       match: [
//         /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\/\w .-]*)*\/?$/,
//         "Invalid URL"
//       ]
//     },

//     publishRequirements: {
//       type: Boolean,
//       default: false
//     },

//     certificates: {
//       type: [String],
//       default: [],
//       validate: {
//         validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 5,
//         message: "Select 1–5 certificates"
//       }
//     },

//     documents: {
//       type: documentSchema,
//       required: function () {
//         return this.publishRequirements;
//       }
//     },

//     gstNumber: { type: String, default: null },
//     panNumber: {
//       type: String,
//       default: null,
//       match: [/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number"]
//     },
//     kycStatus: {
//       type: String,
//       enum: ["none", "pending", "verified", "failed"],
//       default: "none"
//     },

//     isVerified: { type: Boolean, default: false },
//     emailVerificationToken: { type: String },
//     verificationExpires: { type: Date },

//     resetPasswordToken: String,
//     resetPasswordExpires: Date
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("InspectionCompany", inspectionCompanySchema);





// const mongoose = require("mongoose");

// const documentSchema = new mongoose.Schema(
//   {
//     incorporationCertificate: { type: String, required: true },
//     businessLicense: { type: String, default: null }
//   },
//   { _id: false }
// );

// const bankDetailsSchema = new mongoose.Schema(
//   {
//     accountHolderName: { type: String, default: null, trim: true },
//     accountNumber: { type: String, default: null, trim: true },
//     confirmAccountNumber: { type: String, default: null, trim: true },
//     bankName: { type: String, default: null, trim: true },
//     branchName: { type: String, default: null, trim: true },
//     accountType: {
//       type: String,
//       enum: ["savings", "current", "nro", "nre", "other", null],
//       default: null
//     },
//     ifscCode: { type: String, default: null, trim: true },
//     swiftCode: { type: String, default: null, trim: true },
//     ibanNumber: { type: String, default: null, trim: true },
//     bankCountry: { type: String, default: null, trim: true },
//     bankCurrency: { type: String, default: null, trim: true },
//     isIndian: { type: Boolean, default: true },
//     isVerified: { type: Boolean, default: false },
//     updatedAt: { type: Date, default: null }
//   },
//   { _id: false }
// );

// const gstDetailsSchema = new mongoose.Schema(
//   {
//     legalName:        { type: String, default: null },
//     tradeName:        { type: String, default: null },
//     gstType:          { type: String, default: null }, 
//     registrationDate: { type: String, default: null }, 
//     state:            { type: String, default: null },
//     status:           { type: String, default: null }, 
//     lastVerifiedAt:   { type: Date,   default: null },
//   },
//   { _id: false }
// );

// const inspectionCompanySchema = new mongoose.Schema(
//   {
//     role: {
//       type: String,
//       enum: ["inspection_company"],
//       default: "inspection_company",
//       required: true
//     },
//     companyName: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 2,
//       maxlength: 100
//     },
//     phoneNumber: {
//       type: String,
//       required: true,
//       match: [/^\d{6,15}$/, "Invalid phone number"]
//     },
//     mobileNumber: {
//       type: String,
//       required: true,
//       match: [/^\d{6,15}$/, "Invalid mobile number"]
//     },
//     companyEmail: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: [/^\S+@\S+\.\S+$/, "Invalid email"]
//     },
//     password: {
//       type: String,
//       required: true,
//       minlength: 8,
//       select: false
//     },
//     firstName: {
//       type: String,
//       required: true,
//       trim: true,
//       match: [/^[A-Za-z]+$/, "Only alphabets allowed"]
//     },
//     lastName: {
//       type: String,
//       required: true,
//       trim: true,
//       match: [/^[A-Za-z]+$/, "Only alphabets allowed"]
//     },
//     licenseNumber: {
//       type: String,
//       required: function () {
//         return this.publishRequirements;
//       },
//       minlength: 6,
//       maxlength: 64,
//       match: [/^[A-Za-z0-9-\s]+$/, "License uses letters, numbers, spaces, or hyphens"]
//     },
//     websiteUrl: {
//       type: String,
//       default: null,
//       match: [
//         /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\/\w .-]*)*\/?$/,
//         "Invalid URL"
//       ]
//     },
//     publishRequirements: {
//       type: Boolean,
//       default: false
//     },
//     certificates: {
//       type: [String],
//       default: [],
//       validate: {
//         validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 5,
//         message: "Select 1–5 certificates"
//       }
//     },
//     documents: {
//       type: documentSchema,
//       required: function () {
//         return this.publishRequirements;
//       }
//     },
//     gstNumber: { type: String, default: null },
//       gstVerified: { type: Boolean, default: false },  
//     gstDetails:  { type: gstDetailsSchema, default: () => ({}) },
//     panNumber: {
//       type: String,
//       default: null,
//       match: [/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number"]
//     },
//     kycStatus: {
//       type: String,
//       enum: ["none", "pending", "verified", "failed"],
//       default: "none"
//     },
//     bankDetails: {
//       type: bankDetailsSchema,
//       default: () => ({})
//     },
//     isVerified: { type: Boolean, default: false },
//     emailVerificationToken: { type: String },
//     verificationExpires: { type: Date },
//     resetPasswordToken: String,
//     resetPasswordExpires: Date
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("InspectionCompany", inspectionCompanySchema);












const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    incorporationCertificate: { type: String, default: null },
    businessLicense: { type: String, default: null },
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, default: null, trim: true },
    accountNumber: { type: String, default: null, trim: true },
    confirmAccountNumber: { type: String, default: null, trim: true },
    bankName: { type: String, default: null, trim: true },
    branchName: { type: String, default: null, trim: true },
    accountType: {
      type: String,
      enum: ["savings", "current", "nro", "nre", "other", null],
      default: null,
    },
    ifscCode: { type: String, default: null, trim: true },
    swiftCode: { type: String, default: null, trim: true },
    ibanNumber: { type: String, default: null, trim: true },
    bankCountry: { type: String, default: null, trim: true },
    bankCurrency: { type: String, default: null, trim: true },
    isIndian: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const gstAddressSchema = new mongoose.Schema(
  {
    buildingNumber: { type: String, default: null },
    buildingName: { type: String, default: null },
    floor: { type: String, default: null },
    street: { type: String, default: null },
    locality: { type: String, default: null },
    location: { type: String, default: null },
    district: { type: String, default: null },
    state: { type: String, default: null },
    pincode: { type: String, default: null },
    landmark: { type: String, default: null },
  },
  { _id: false }
);

const gstDetailsSchema = new mongoose.Schema(
  {
    legalName: { type: String, default: null },
    tradeName: { type: String, default: null },
    gstType: { type: String, default: null },
    registrationDate: { type: String, default: null },
    state: { type: String, default: null },
    status: { type: String, default: null },
    lastVerifiedAt: { type: Date, default: null },
    address: { type: gstAddressSchema, default: () => ({}) },
  },
  { _id: false }
);

const legalDocumentSchema = new mongoose.Schema(
  {
    url: { type: String, default: null },
    originalName: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
  },
  { _id: false }
);

const inspectionCompanySchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["inspection_company"],
      default: "inspection_company",
      required: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid phone number"],
    },
    mobileNumber: {
      type: String,
      required: true,
      match: [/^\d{6,15}$/, "Invalid mobile number"],
    },
    countryCode: {
      type: String,
      default: "+91",
      trim: true,
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
    firstName: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z]+$/, "Only alphabets allowed"],
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z]+$/, "Only alphabets allowed"],
    },
    licenseNumber: {
      type: String,
      default: null,
      minlength: 6,
      maxlength: 64,
      match: [/^[A-Za-z0-9-\s]+$/, "License uses letters, numbers, spaces, or hyphens"],
    },
    websiteUrl: {
      type: String,
      default: null,
      match: [/^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\/\w .-]*)*\/?$/, "Invalid URL"],
    },
    publishRequirements: {
      type: Boolean,
      default: false,
    },
    certificates: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 5,
        message: "Select 1–5 certificates",
      },
    },
    documents: {
      type: documentSchema,
      default: () => ({}),
    },
    gstNumber: { type: String, default: null },
    gstVerified: { type: Boolean, default: false },
    gstDetails: { type: gstDetailsSchema, default: () => ({}) },
    legalDocument: { type: legalDocumentSchema, default: () => ({}) },
    panNumber: {
      type: String,
      default: null,
      match: [/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number"],
    },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified", "failed"],
      default: "none",
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    verificationExpires: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionCompany", inspectionCompanySchema);