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
  getConfirmedCustomersForCompany
} = require("../../controllers/inspectionCompany/companyController");

const companyUploader = createUploader("inspectionCompanies");

router.get("/enquiries", verifyUser, getAvailableEnquiriesForCompany);

router.post("/bid/:enquiryId", verifyUser, placeCompanyBid);
router.delete("/bid/:bidId", verifyUser, cancelCompanyBid);
router.get("/my-bids", verifyUser, getMyCompanyBids);
router.get("/lowest-bids", verifyUser, getLowestCompanyBidsPerEnquiry);

router.patch(
  "/profile/updateDocuments",
  verifyUser,
  companyUploader.fields([
    { name: "incorporationCertificate", maxCount: 1 }
  ]),
  updateCompanyDocumentsController
);

router.get("/won-bids", verifyUser, getCompanyWonBids);
router.get("/analysis", verifyUser, getCompanyAnalytics);
router.get("/history", verifyUser, getCompanyHistory);
router.get("/confirmed-customers", verifyUser, getConfirmedCustomersForCompany);

module.exports = router;
