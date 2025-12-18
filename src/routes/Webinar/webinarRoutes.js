const express = require("express");
const router = express.Router();
const { registerWebinar } = require("../../controllers/Webinar/webinarController");

router.post("/register", registerWebinar);

module.exports = router;
