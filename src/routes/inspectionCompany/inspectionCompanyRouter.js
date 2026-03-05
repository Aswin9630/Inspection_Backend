// const express = require("express");
// const router = express.Router();
// const verifyUser = require("../../middleware/verifyUser");
// const createUploader = require("../../middleware/upload");
// const {
//   getAvailableEnquiriesForCompany,
//   placeCompanyBid,
//   cancelCompanyBid,
//   getMyCompanyBids,
//   getLowestCompanyBidsPerEnquiry,
//   updateCompanyDocumentsController,
//   getCompanyHistory,
//   getCompanyWonBids,
//   getCompanyAnalytics,
//   getConfirmedCustomersForCompany
// } = require("../../controllers/inspectionCompany/companyController");
// const { saveQuickInspectionController, getQuickInspectionController, removeLocationController } = require("../../controllers/inspectionCompany/quickInspectionController");
// const { createInspectionRequestController } = require("../../controllers/QuickInspection/inspectionRequestController");


// const companyUploader = createUploader("inspectionCompanies");

// router.get("/enquiries", verifyUser, getAvailableEnquiriesForCompany);
// router.post("/bid/:enquiryId", verifyUser, placeCompanyBid);
// router.delete("/bid/:bidId", verifyUser, cancelCompanyBid);
// router.get("/my-bids", verifyUser, getMyCompanyBids);
// router.get("/lowest-bids", verifyUser, getLowestCompanyBidsPerEnquiry);
// router.patch(
//   "/profile/updateDocuments",
//   verifyUser,
//   companyUploader.fields([
//     { name: "incorporationCertificate", maxCount: 1 }
//   ]),
//   updateCompanyDocumentsController
// );

// router.get("/won-bids", verifyUser, getCompanyWonBids);
// router.get("/analysis", verifyUser, getCompanyAnalytics);
// router.get("/history", verifyUser, getCompanyHistory);
// router.get("/confirmed-customers", verifyUser, getConfirmedCustomersForCompany);


// router.post("/quick-inspection/save",verifyUser, saveQuickInspectionController);
// router.get("/quick-inspection/:companyId",verifyUser, getQuickInspectionController);
// router.delete("/quick-inspection/:docId/location/:locationId", verifyUser, removeLocationController);
// router.post("/inspection-request/request", verifyUser, createInspectionRequestController);


// module.exports = router;




const express = require("express");
const router = express.Router();
const verifyUser = require("../../middleware/verifyUser");
const createUploader = require("../../middleware/upload");
const {
  getAvailableEnquiriesForCompany,
  placeCompanyBid,
  cancelCompanyBid,
  getMyCompanyBids,
  getLowestCompanyBidsPerEnquiry,
  updateCompanyDocumentsController,
  getCompanyHistory,
  getCompanyWonBids,
  getCompanyAnalytics,
  getConfirmedCustomersForCompany,
  updateCompanyProfileController
} = require("../../controllers/inspectionCompany/companyController");
const { saveQuickInspectionController, getQuickInspectionController, removeLocationController } = require("../../controllers/inspectionCompany/quickInspectionController");
const { getCompanyRequestsController, updateRequestStatusController } = require("../../controllers/QuickInspection/inspectionRequestController");
const { getBankDetailsController, saveBankDetailsController } = require("../../controllers/inspectionCompany/Bankdetailscontroller");
const { getCompanyWalletController } = require("../../controllers/payment/WalletController");
const { verifyCompanyGstController, getCompanyGstStatusController, uploadCompanyLegalDocumentController } = require("../../controllers/KYC/kycController");

const companyUploader = createUploader("inspectionCompanies");
const legalDocUploader = createUploader("companyLegalDocuments");

router.get("/enquiries", verifyUser, getAvailableEnquiriesForCompany);
router.post("/bid/:enquiryId", verifyUser, placeCompanyBid);
router.delete("/bid/:bidId", verifyUser, cancelCompanyBid);
router.get("/my-bids", verifyUser, getMyCompanyBids);
router.get("/lowest-bids", verifyUser, getLowestCompanyBidsPerEnquiry);
router.patch(
  "/profile/updateDocuments",
  verifyUser,
  companyUploader.fields([{ name: "incorporationCertificate", maxCount: 1 }]),
  updateCompanyDocumentsController
); 
 
router.patch("/profile/update", verifyUser, updateCompanyProfileController);

router.get("/won-bids", verifyUser, getCompanyWonBids);
router.get("/analysis", verifyUser, getCompanyAnalytics);
router.get("/history", verifyUser, getCompanyHistory);
router.get("/confirmed-customers", verifyUser, getConfirmedCustomersForCompany);

router.post("/quick-inspection/save", verifyUser, saveQuickInspectionController);
router.get("/quick-inspection/:companyId", verifyUser, getQuickInspectionController);
router.delete("/quick-inspection/:docId/location/:locationId", verifyUser, removeLocationController);
 
router.get("/quick-requests", verifyUser, getCompanyRequestsController);
router.patch("/quick-requests/:requestId/status", verifyUser, updateRequestStatusController);


router.get("/bank-details", verifyUser, getBankDetailsController);
router.post("/bank-details", verifyUser, saveBankDetailsController);

router.get("/wallet", verifyUser, getCompanyWalletController);

router.post("/kyc/verify-gst",  verifyUser, verifyCompanyGstController);
router.get( "/kyc/gst-status",  verifyUser, getCompanyGstStatusController);
router.post(
  "/kyc/upload-legal-document",
  verifyUser,
  legalDocUploader.single("legalDocument"),
  uploadCompanyLegalDocumentController
);
module.exports = router;