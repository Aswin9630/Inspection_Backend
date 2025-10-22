const express = require("express");
const router = express.Router();
const { createInitialOrderForEnquiry, webHooksController,verifyInitialPaymentAndConfirmBid,verifyQuickServicePayment, createFinalOrderForEnquiry, verifyFinalPaymentAndCompleteEnquiry } = require("../../controllers/payment/paymentController");
const verifyUser = require("../../middleware/verifyUser");

router.post("/createInitialOrder/:enquiryId", verifyUser, createInitialOrderForEnquiry);
router.post("/createFinalOrder/:enquiryId", verifyUser, createFinalOrderForEnquiry);
router.post("/webhook", webHooksController)
router.post("/verify", verifyUser, verifyInitialPaymentAndConfirmBid);
router.post("/verifyFinal", verifyUser, verifyFinalPaymentAndCompleteEnquiry);
router.post("/verifyQuickService", verifyUser, verifyQuickServicePayment);

module.exports = router;
