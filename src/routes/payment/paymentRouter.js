const express = require("express");
const router = express.Router();
const { createOrderForEnquiry, webHooksController,verifyPaymentAndConfirmBid } = require("../../controllers/payment/paymentController");
const verifyUser = require("../../middleware/verifyUser");

router.post("/createOrder/:enquiryId", verifyUser, createOrderForEnquiry);
router.post("/webhook", webHooksController)
router.post("/verify", verifyUser, verifyPaymentAndConfirmBid);

module.exports = router;
