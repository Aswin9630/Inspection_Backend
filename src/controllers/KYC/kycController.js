const { verifyPan, verifyGst } = require("../../config/sandboxClient");
const Customer = require("../../models/Customer/customerModel");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");

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



// const verifyCompanyGstController = async (req, res) => {
//   try {
//     const companyId = req.user?._id;
//     const { gstNumber } = req.body;

//     if (!gstNumber) {
//       return res.status(400).json({ success: false, message: "GST number is required" });
//     }

//     if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(gstNumber)) {
//       return res.status(400).json({ success: false, message: "Invalid GST format" });
//     }

//     const duplicate = await InspectionCompany.findOne({
//       gstNumber,
//       _id: { $ne: companyId },
//     });
//     if (duplicate) {
//       return res.status(400).json({
//         success: false,
//         message: "This GST number is already linked to another account",
//       });
//     }

//     const result  = await verifyGst(gstNumber);
//     const gstData = result?.data?.data;

//     if (!gstData || gstData.sts !== "Active") {
//       return res.status(400).json({
//         success: false,
//         message: "GST is not active. Only Active GSTINs are accepted.",
//       });
//     }

//     const gstDetails = {
//       legalName:        gstData.lgnm     || "",
//       tradeName:        gstData.tradeNam || "",
//       gstType:          gstData.ctb      || "",
//       registrationDate: gstData.rgdt     || "",
//       state:            gstData.stj      || "",
//       status:           gstData.sts,
//       lastVerifiedAt:   new Date(),
//     };

//     const updatedCompany = await InspectionCompany.findByIdAndUpdate(
//       companyId,
//       {
//         $set: {
//           gstNumber,
//           gstVerified: true,
//           gstDetails,
//         },
//       },
//       { new: true }
//     ).select("companyName companyEmail mobileNumber gstNumber gstVerified gstDetails createdAt");

//     return res.json({
//       success: true,
//       message: "GST verified and saved successfully",
//       data: {
//         gstNumber,
//         verified:   true,
//         status:     "Active",
//         gstDetails,
//         company:    updatedCompany,
//       },
//     });
//   } catch (err) {
//     console.error("verifyCompanyGstController error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || "GST verification failed",
//     });
//   }
// };


// const getCompanyGstStatusController = async (req, res) => {
//   try {
//     const company = await InspectionCompany.findById(req.user._id).select(
//       "gstNumber gstVerified gstDetails"
//     );
//     if (!company) {
//       return res.status(404).json({ success: false, message: "Company not found" });
//     }

//     return res.json({
//       success: true,
//       data: {
//         gstNumber:   company.gstNumber  || null,
//         gstVerified: company.gstVerified || false,
//         gstDetails:  company.gstDetails  || null,
//       },
//     });
//   } catch (err) {
//     console.error("getCompanyGstStatusController error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };



const verifyCompanyGstController = async (req, res) => {
  try {
    const companyId = req.user?._id;
    const { gstNumber } = req.body;

    if (!gstNumber)
      return res.status(400).json({ success: false, message: "GST number is required" });
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(gstNumber))
      return res.status(400).json({ success: false, message: "Invalid GST format" });

    const duplicate = await InspectionCompany.findOne({
      gstNumber,
      _id: { $ne: companyId },
    });
    if (duplicate)
      return res.status(400).json({
        success: false,
        message: "This GST number is already linked to another account",
      });

    const result = await verifyGst(gstNumber);
    const gstData = result?.data?.data;

    if (!gstData || gstData.sts !== "Active")
      return res.status(400).json({
        success: false,
        message: "GST is not active. Only Active GSTINs are accepted.",
      });

    const addr = gstData.pradr?.addr || {};

    const gstDetails = {
      legalName: gstData.lgnm || "",
      tradeName: gstData.tradeNam || "",
      gstType: gstData.ctb || "",
      registrationDate: gstData.rgdt || "",
      state: gstData.stj || "",
      status: gstData.sts,
      lastVerifiedAt: new Date(),
      address: {
        buildingNumber: addr.bno || "",
        buildingName: addr.bnm || "",
        floor: addr.flno || "",
        street: addr.st || "",
        locality: addr.locality || "",
        location: addr.loc || "",
        district: addr.dst || "",
        state: addr.stcd || "",
        pincode: addr.pncd || "",
        landmark: addr.landMark || "",
      },
    };

    const updatedCompany = await InspectionCompany.findByIdAndUpdate(
      companyId,
      { $set: { gstNumber, gstVerified: true, gstDetails } },
      { new: true }
    ).select(
      "companyName companyEmail mobileNumber countryCode gstNumber gstVerified gstDetails createdAt"
    );

    return res.json({
      success: true,
      message: "GST verified and saved successfully",
      data: {
        gstNumber,
        verified: true,
        status: "Active",
        gstDetails,
        company: updatedCompany,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "GST verification failed" });
  }
};

const getCompanyGstStatusController = async (req, res) => {
  try {
    const company = await InspectionCompany.findById(req.user._id).select(
      "gstNumber gstVerified gstDetails countryCode legalDocument"
    );
    if (!company)
      return res.status(404).json({ success: false, message: "Company not found" });

    return res.json({
      success: true,
      data: {
        countryCode: company.countryCode || "+91",
        gstNumber: company.gstNumber || null,
        gstVerified: company.gstVerified || false,
        gstDetails: company.gstDetails || null,
        legalDocument: company.legalDocument || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const uploadCompanyLegalDocumentController = async (req, res) => {
  try {
    const companyId = req.user?._id;

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a valid document (PDF, JPG, PNG).",
      });
    }

    const legalDocument = {
      url: req.file.path,
      originalName: req.file.originalname || "document",
      uploadedAt: new Date(),
    };

    const updatedCompany = await InspectionCompany.findByIdAndUpdate(
      companyId,
      { $set: { legalDocument } },
      { new: true }
    ).select("companyName companyEmail countryCode legalDocument");

    return res.json({
      success: true,
      message: "Legal document uploaded successfully",
      data: { legalDocument, company: updatedCompany },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
};


module.exports = { verifyPanController, verifyGstController, verifyCompanyGstController,getCompanyGstStatusController,uploadCompanyLegalDocumentController };
