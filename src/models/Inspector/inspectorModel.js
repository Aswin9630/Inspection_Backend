const mongoose = require("mongoose");

const allowedCommodities = [
  "Textiles & Garments",
  "Electronics & Electrical",
  "Automotive Parts",
  "Food & Beverages",
  "Pharmaceuticals",
  "Chemicals",
  "Machinery & Equipment",
  "Furniture & Wood Products",
  "Metals & Alloys",
  "Plastics & Rubber",
  "Agricultural Products",
  "Jewelry & Accessories",
  "Toys & Games",
  "Cosmetics & Personal Care",
  "Sports Equipment",
  "Other",
];

const inspectorSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["inspector"],
      default: "inspector",
      required: true,
    },
    inspectorType: {
      type: String,
      enum: ["international", "indian"],
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
    acceptsRequests: {
      type: Boolean,
      default: false,
    },
    identityDocuments: {
      aadhaarCard: {
        type: String,
        required: function () {
          return this.acceptsRequests;
        },
      },
    },
    
    billingDetails: {
      accountNumber: {
        type: String,
        required: function () {
          return this.acceptsRequests;
        },
      },
      bankName: {
        type: String,
        required: function () {
          return this.acceptsRequests;
        },
      },
      ifscCode: {
        type: String,
        required: function () {
          return this.acceptsRequests;
        },
      },
    },

  isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    verificationExpires: { type: Date }, 

    commodities: [
      {
        commodity: {
          type: String,
          enum: allowedCommodities,
          required: true,
        },
        experienceYears: {
          type: Number,
          min: 0,
          max: 50,
          required: true,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inspector", inspectorSchema);
