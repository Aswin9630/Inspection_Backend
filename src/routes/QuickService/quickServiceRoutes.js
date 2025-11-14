const express = require("express");
const router = express.Router();
const { addToCart, getCartItems, deleteCartItem, createOrder, verifyPayment, webhookHandler, computeTotal, markCartItemEnquiryRaised } = require("../../controllers/QuickServices/cartController");
const verifyUser = require("../../middleware/verifyUser");
const { getUserOrders, getOrderById } = require("../../controllers/QuickServices/ordersController");
const { createOtherLocationRequest } = require("../../controllers/QuickServices/otherLocationController");
const { getQuickServicePayments, getQuickServicePaymentById, getQuickServiceInvoice } = require("../../controllers/QuickServices/paymentController");

router.post("/add", verifyUser ,addToCart);
router.post("/createOrder", verifyUser, createOrder);
router.post("/verify", verifyUser, verifyPayment);
router.post("/webhook", express.raw({ type: "*/*" }), webhookHandler);
router.get("/computeTotal", verifyUser, computeTotal);
router.get("/orders", verifyUser, getUserOrders);
router.get("/orders/:id", verifyUser, getOrderById);
router.get("/:userId",verifyUser, getCartItems);
router.delete("/cart/:id", verifyUser, deleteCartItem);
router.post("/cart/mark-enquiry-raised/:id", verifyUser, markCartItemEnquiryRaised)
router.post("/other-location-request", verifyUser, createOtherLocationRequest);

router.get("/payment", verifyUser, getQuickServicePayments);
router.get("/payment/:id", verifyUser, getQuickServicePaymentById);

router.get("/invoice/:paymentId", verifyUser, getQuickServiceInvoice)


module.exports = router;
