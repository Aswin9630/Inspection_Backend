const express = require("express");
const router = express.Router();
const verifyUser = require("../../middleware/verifyUser");


const {
  getLocationList,
  submitQuickServiceForm,
  verifyQuickServicePayment,
} = require("../../controllers/customer/quickServiceController");

router.get("/locations", getLocationList);
router.post("/submit", verifyUser, submitQuickServiceForm);

module.exports = router;

