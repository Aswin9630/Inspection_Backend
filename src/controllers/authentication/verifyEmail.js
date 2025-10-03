const Customer = require("../../models/Customer/customerModel");
const Inspector = require("../../models/Inspector/inspectorModel");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");

const verifyEmailController = async (req, res, next) => {
  try {
    const { token, role } = req.query;

    const Model =
      role === "customer"
        ? Customer
        : role === "inspector"
        ? Inspector
        : InspectionCompany;

    const user = await Model.findOne({
      emailVerificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).send("Invalid or expired token");

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.send("✅ Email verified! You can now log in.");
  } catch (error) {
    next(error);
  }
};

module.exports = verifyEmailController;
