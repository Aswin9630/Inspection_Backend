const express = require("express");
const router = express.Router();
const createUploader = require("../../middleware/upload");
const {
  getAvailableEnquiries,
  placeBid,
  cancelBid,
  getMyBids,
  getLowestBidsPerEnquiry,
  updateInspectorDocumentsController
} = require("../../controllers/inspector/inspectorController");
const verifyUser = require("../../middleware/verifyUser");

const inspectorUploader = createUploader("inspectors");

router.get("/enquiries", verifyUser, getAvailableEnquiries);
router.post("/bid/:enquiryId", verifyUser, placeBid);
router.delete("/bid/:bidId", verifyUser, cancelBid);
router.get("/my-bids", verifyUser, getMyBids);
router.get("/lowest-bids", verifyUser, getLowestBidsPerEnquiry);
router.patch(
  "/profile/updateDocuments",
  verifyUser,
  inspectorUploader.fields([
    { name: "aadhaarCard", maxCount: 1 }
  ]),
  updateInspectorDocumentsController
);


module.exports = router;
