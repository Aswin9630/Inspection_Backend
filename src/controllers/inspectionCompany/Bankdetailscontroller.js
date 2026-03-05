const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");

exports.saveBankDetailsController = async (req, res) => {
  try {
    const {
      accountHolderName,
      accountNumber,
      confirmAccountNumber,
      bankName,
      branchName,
      accountType,
      ifscCode,
      swiftCode,
      ibanNumber,
      bankCountry,
      bankCurrency,
      isIndian
    } = req.body;

    if (!accountHolderName || !accountNumber || !confirmAccountNumber || !bankName) {
      return res.status(400).json({ success: false, message: "Account holder name, account number and bank name are required" });
    }

    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ success: false, message: "Account numbers do not match" });
    }

    if (isIndian && !ifscCode) {
      return res.status(400).json({ success: false, message: "IFSC code is required for Indian bank accounts" });
    }

    if (!isIndian && !swiftCode) {
      return res.status(400).json({ success: false, message: "SWIFT/BIC code is required for international bank accounts" });
    }

    const bankDetails = {
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      confirmAccountNumber: confirmAccountNumber.trim(),
      bankName: bankName.trim(),
      branchName: branchName?.trim() || null,
      accountType: accountType || null,
      ifscCode: isIndian ? ifscCode?.trim().toUpperCase() : null,
      swiftCode: !isIndian ? swiftCode?.trim().toUpperCase() : null,
      ibanNumber: !isIndian ? ibanNumber?.trim() || null : null,
      bankCountry: bankCountry?.trim() || null,
      bankCurrency: bankCurrency?.trim() || null,
      isIndian: Boolean(isIndian),
      isVerified: false,
      updatedAt: new Date()
    };

    await InspectionCompany.findByIdAndUpdate(
      req.user._id,
      { $set: { bankDetails } },
      { runValidators: false }
    );

    return res.status(200).json({ success: true, message: "Bank details saved successfully", data: bankDetails });
  } catch (err) {
    console.error("saveBankDetailsController error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
 
exports.getBankDetailsController = async (req, res) => {
  try {
    const company = await InspectionCompany.findById(req.user._id).select("bankDetails");
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });
    return res.status(200).json({ success: true, data: company.bankDetails || null });
  } catch (err) {
    console.error("getBankDetailsController error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


