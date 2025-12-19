const express = require("express");
const router = express.Router();
const verifyUser = require("../../middleware/verifyUser");
const createUploader = require("../../middleware/upload");
const {
  raiseEnquiryController,
  getMyEnquiries,
  getBidsForEnquiry,
  confirmBid,
  cancelEnquiry,
  updateCustomerDocumentsController,
  getEnquiryDetails,
  getCustomerPayments,
  getCustomerAnalysis,getWonInspectors,
  getDashboardStats
} = require("../../controllers/customer/customerController");

const customerUploader = createUploader("customers");

router.post("/raise-enquiry", verifyUser,  customerUploader.fields([{ name: "attachment", maxCount: 1 }]), raiseEnquiryController);
router.get("/my-enquiries", verifyUser, getMyEnquiries);
router.get("/raiseEnquiry/:id/details", verifyUser, getEnquiryDetails);
router.get("/bids/:enquiryId", verifyUser, getBidsForEnquiry);
router.post("/confirm-bid/:bidId", verifyUser, confirmBid);
router.get("/payments", verifyUser, getCustomerPayments);
router.get("/analysis", verifyUser, getCustomerAnalysis);
router.patch("/cancel-enquiry/:enquiryId", verifyUser, cancelEnquiry);
router.patch(
  "/profile/updateDocuments",
  verifyUser,
  customerUploader.fields([
    { name: "tradeLicense", maxCount: 1 }, 
    { name: "importExportCertificate", maxCount: 1 },
  ]),
  updateCustomerDocumentsController
);
router.get("/won-inspections", verifyUser, getWonInspectors);
router.get("/dashboardStatus", verifyUser, getDashboardStats);

module.exports = router;
