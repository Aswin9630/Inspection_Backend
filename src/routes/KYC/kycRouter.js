const express = require("express");
const { verifyPanController, verifyGstController } = require("../../controllers/KYC/kycController");
const verifyUser = require("../../middleware/verifyUser");
const router = express.Router();

router.post("/verify-pan", verifyPanController);
router.post("/verify-gst", verifyUser, verifyGstController);

module.exports = router; 
