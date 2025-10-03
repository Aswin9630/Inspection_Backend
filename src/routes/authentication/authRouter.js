const express = require("express")
const router = express.Router();
const { getUserProfileController,logoutController,signInController,signUpController } = require("../../controllers/authentication/authenticationController");
const {handleValidationErrors,signInValidation,signUpValidation} = require("../../middleware/validation");
const verifyUser = require("../../middleware/verifyUser");
const createUploader = require("../../middleware/upload");
const verifyEmailController = require("../../controllers/authentication/verifyEmail");

const customerUploader = createUploader("customers");
const inspectorUploader = createUploader("inspectors");
const companyUploader = createUploader("inspectionCompanies");

router.post(
  "/signup/customer",
  customerUploader.fields([
    { name: "tradeLicense", maxCount: 1 },
    { name: "importExportCertificate", maxCount: 1 },
  ]),
  signUpValidation(),
  handleValidationErrors,
  signUpController
);

router.post(
  "/signup/inspector",
  inspectorUploader.fields([
    { name: "aadhaarCard", maxCount: 1 },
  ]), 
  signUpValidation(),
  handleValidationErrors,
  signUpController
);

router.post(
  "/signup/inspectionCompany",
  companyUploader.fields([
    { name: "businessLicense", maxCount: 1 },
    { name: "incorporationCertificate", maxCount: 1 },
    { name: "insuranceDocument", maxCount: 1 },
  ]),
  signUpValidation(),
  handleValidationErrors,
  signUpController
);

router.post("/signin",signInValidation(),handleValidationErrors,signInController)
router.post("/logout",handleValidationErrors,logoutController)
router.get("/profile",verifyUser,getUserProfileController)
router.get("/verify-email", verifyEmailController);
module.exports = router
