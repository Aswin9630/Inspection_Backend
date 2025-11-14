const express = require("express");
const router = express.Router();
const verifyUser = require("../../middleware/verifyUser");

const {
  // getLocationList,
  submitQuickServiceForm,
  getGroupedLocationsByState,
  getQuickServiceHistory,
  getQuickServiceDetails
} = require("../../controllers/customer/quickServiceController");

router.get("/locations", getGroupedLocationsByState);
router.post("/submit", verifyUser, submitQuickServiceForm);
router.get("/quick-requests", verifyUser, getQuickServiceHistory);
router.get("/quick-requests/:id", verifyUser, getQuickServiceDetails)

module.exports = router;
