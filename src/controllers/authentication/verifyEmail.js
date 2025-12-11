const Customer = require("../../models/Customer/customerModel");
const Inspector = require("../../models/Inspector/inspectorModel");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");

const verifyEmailController = async (req, res, next) => {
  try {
    const { token, role } = req.query;
    if (!token) return res.status(400).send("Missing token");

    const Model =
      role === "customer"
        ? Customer
        : role === "inspector"
        ? Inspector
        : InspectionCompany;

       const updated = await Model.findOneAndUpdate(
      {
        emailVerificationToken: token,
        verificationExpires: { $gt: Date.now() },
      },
      {
        $set: { isVerified: true },
        $unset: { emailVerificationToken: "", verificationExpires: "" },
      },
      { new: true, runValidators: false } 
    );

    if (!updated) return res.status(400).send("Invalid or expired token");
    res.send("✅ Email verified! You can now log in.");
  } catch (error) {
    next(error);
  }
};

module.exports = verifyEmailController;
