const mongoose = require("mongoose");

const WebinarRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: {
      type: String,
      required: true,
      enum: ["exporter", "importer", "both", "logistics", "other"],
    },
    consent: { type: Boolean, default: true },
    source: { type: String, default: "web" },
  },
  { timestamps: true }
);

WebinarRegistrationSchema.index({ email: 1, createdAt: 1 });

module.exports = mongoose.model("WebinarRegistration", WebinarRegistrationSchema);
