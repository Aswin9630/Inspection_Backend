const express = require("express");
const router = express.Router();
const { sendContactEnquiry } = require("../../controllers/Home/contactController");

router.post("/sendEnquiry", sendContactEnquiry);

module.exports = router;
