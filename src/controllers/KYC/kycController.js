const { verifyPan, verifyGst } = require("../../config/sandboxClient");
const Customer = require("../../models/Customer/customerModel");

const verifyPanController = async (req, res) => {
  try {
    const { panNumber } = req.body;
    
    if (!panNumber) return res.status(400).json({ success: false, message: "PAN number is required" });

    if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(panNumber)) {
      return res.status(400).json({ success: false, message: "Invalid PAN format" });
    }

    const result = await verifyPan(panNumber);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("verifyPanController error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "PAN verification failed" });
  }
};

const verifyGstController = async (req, res) => {
  try {
    const { gstNumber  } = req.body;
    const userId = req.user?._id;
    if (!gstNumber ) return res.status(400).json({ success: false, message: "GST number is required" });

     if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(gstNumber )) {
      return res.status(400).json({ success: false, message: "Invalid GST format" });
    }

        const query = { gstNumber };

    if (userId) query._id = { $ne: userId };

    const existing = await Customer.findOne(query);

    if (existing) {
     return res.status(400).json({
  success: false,
  message: "GST number already linked to another account",
});
    }
 
    const result = await verifyGst(gstNumber );
     const gstData = result?.data?.data;
    if (!gstData || gstData.sts !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Inactive GST",
      });
    }

     const gstDetails  = {
      legalName: gstData.lgnm,
      tradeName: gstData.tradeNam,
      gstType: gstData.ctb,
      registrationDate: gstData.rgdt,
      state: gstData.stj,
      lastVerifiedAt: new Date(),
      status:gstData.sts
    };

      const customer = await Customer.findByIdAndUpdate(userId, {
        gstNumber,
        gstVerified: true,
        gstDetails,
        publishRequirements: true,
      },
     { new: true }
    );

    return res.json({
      success: true,
      message: "GST verified successfully",
      data: {
        gstNumber, 
        verified: true,
        status: "Active",
        gstDetails,  
        customer
      },
    });
  } catch (err) {
    console.error("verifyGstController error:", err);
    return res.status(500).json({ success: false, message: err.message || "GST verification failed..." });
  }
};

module.exports = { verifyPanController, verifyGstController };
