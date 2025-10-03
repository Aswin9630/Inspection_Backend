const express = require("express");
const router = express.Router();
const createUploader = require("../../middleware/upload");
const {
  getAvailableEnquiries,
  placeBid,
  cancelBid,
  getMyBids,
  getLowestBidsPerEnquiry,
  updateInspectorDocumentsController,
  getInspectorHistory,
  getWonBids
} = require("../../controllers/inspector/inspectorController");
const verifyUser = require("../../middleware/verifyUser");

const inspectorUploader = createUploader("inspectors");

router.get("/enquiries", verifyUser, getAvailableEnquiries);
router.post("/bid/:enquiryId", verifyUser, placeBid);
router.delete("/bid/:bidId", verifyUser, cancelBid);
router.get("/my-bids", verifyUser, getMyBids);
router.get("/lowest-bids", verifyUser, getLowestBidsPerEnquiry);
router.get("/history", verifyUser, getInspectorHistory)
router.patch(
  "/profile/updateDocuments",
  verifyUser,
  inspectorUploader.fields([
    { name: "aadhaarCard", maxCount: 1 }
  ]),
  updateInspectorDocumentsController
);
router.get("/won-bids", verifyUser, getWonBids);
 

module.exports = router;
