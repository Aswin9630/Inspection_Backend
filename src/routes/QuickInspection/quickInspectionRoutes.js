const express = require("express");
const router = express.Router();
const verifyUser = require("../../middleware/verifyUser");
const { createInspectionRequestController } = require("../../controllers/QuickInspection/inspectionRequestController");
const { getMarketplaceCompaniesController } = require("../../controllers/inspectionCompany/quickInspectionController");
const { getCustomerRequestsController } = require("../../controllers/QuickInspection/Customerquickcontroller");
const { createQuickInspectionOrder, verifyQuickInspectionPayment } = require("../../controllers/QuickInspection/Razorpaycontroller");
const { getCustomerWalletController } = require("../../controllers/payment/WalletController");

router.post("/inspection-request/request", verifyUser, createInspectionRequestController);
router.get("/inspection-marketplace", getMarketplaceCompaniesController);
router.get("/my-requests", verifyUser, getCustomerRequestsController);

router.post("/payment/create-order", verifyUser, createQuickInspectionOrder);
router.post("/payment/verify", verifyUser, verifyQuickInspectionPayment);


router.get("/wallet", verifyUser, getCustomerWalletController); 

module.exports = router;