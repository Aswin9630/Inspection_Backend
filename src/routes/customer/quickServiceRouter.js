const express = require("express");
const router = express.Router();
const verifyUser = require("../../middleware/verifyUser");

const {
  getLocationList,
  submitQuickServiceForm,
  getGroupedLocationsByState,
  verifyQuickServicePayment,
} = require("../../controllers/customer/quickServiceController");

router.get("/locations", getGroupedLocationsByState);
router.post("/submit", verifyUser, submitQuickServiceForm);

module.exports = router;
