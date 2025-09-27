const { check, validationResult } = require("express-validator");

const passwordRules = () =>
  check("password")
    .isLength({ min: 8, max: 20 })
    .withMessage("Password must be between 8 and 20 characters")
    .matches(/[A-Z]/)
    .withMessage("Must include at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Must include at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Must include at least one number")
    .matches(/[!@#$%^&*(){}:"<>?,.|]/)
    .withMessage("Must include at least one special character");

const emailRule = (field = "email") =>
  check(field, "Invalid email format").isEmail();

const mobileRule = (field = "mobileNumber") =>
  check(field, "Invalid mobile number").matches(/^\d{6,15}$/);

const countryCodeRule = () =>
  check("countryCode", "Invalid country code").matches(/^\+\d{1,4}$/);

const signUpValidation = () => {
  return [
    check("role", "Role is required").isIn([
      "customer",
      "inspector",
      "inspection company",
    ]),

    (req, res, next) => {
      const role = req.body.role;

      let validations = [];

      if (role === "customer") {
        validations = [
          check("name", "Name is required").isString().isLength({ min: 2 }),
          emailRule(),
          passwordRules(),
          countryCodeRule(),
          mobileRule(),
          check("address", "Address too long")
            .optional()
            .isLength({ max: 100 }),
          check("publishRequirements").optional().isBoolean(),
          check("documents.tradeLicense").custom((value, { req }) => {
            const shouldRequire =
              req.body.publishRequirements === "true" ||
              req.body.publishRequirements === true;
            const fileExists = req.files?.tradeLicense?.length > 0;
            if (shouldRequire && !fileExists) {
              throw new Error("Trade license is required");
            }
            return true;
          }),

          check("documents.importExportCertificate").custom(
            (value, { req }) => {
              const shouldRequire =
                req.body.publishRequirements === "true" ||
                req.body.publishRequirements === true;
              const fileExists = req.files?.importExportCertificate?.length > 0;
              if (shouldRequire && !fileExists) {
                throw new Error("Import/Export certificate is required");
              }
              return true;
            }
          ),
        ];
      }

      if (role === "inspector") {
        validations = [
          check("name", "Name is required").isString().isLength({ min: 2 }),
          emailRule(),
          passwordRules(),
          countryCodeRule(),
          mobileRule(),
          check("address", "Address too long")
            .optional()
            .isLength({ max: 100 }),
          check(
            "inspectorType",
            "Inspector type must be 'indian' or 'international'"
          ).isIn(["indian", "international"]),
          check("acceptsRequests").optional().isBoolean(),

          check("identityDocuments.aadhaarCard").custom((value, { req }) => {
            const requiresDocs =
              req.body.acceptsRequests === "true" ||
              req.body.acceptsRequests === true;
            const fileExists = req.files?.aadhaarCard?.length > 0;
            if (requiresDocs && !fileExists) {
              throw new Error("Aadhaar card is required to accept requests");
            }
            return true;
          }),

          check("accountNumber").custom((value, { req }) => {
            const requiresDocs =
              req.body.acceptsRequests === "true" ||
              req.body.acceptsRequests === true;
            if (requiresDocs && (!value || value.trim() === "")) {
              throw new Error("Account number is required to accept requests");
            }
            return true;
          }),

          check("bankName").custom((value, { req }) => {
            const requiresDocs =
              req.body.acceptsRequests === "true" ||
              req.body.acceptsRequests === true;
            if (requiresDocs && (!value || value.trim() === "")) {
              throw new Error("Bank name is required to accept requests");
            }
            return true;
          }),

          check("ifscCode").custom((value, { req }) => {
            const requiresDocs =
              req.body.acceptsRequests === "true" ||
              req.body.acceptsRequests === true;
            if (requiresDocs && (!value || value.trim() === "")) {
              throw new Error("IFSC code is required to accept requests");
            }
            return true;
          }),

          check("commodities")
            .isArray()
            .withMessage("Commodities must be an array"),
          check("commodities.*.commodity", "Commodity is required").notEmpty(),
          check(
            "commodities.*.experienceYears",
            "Experience must be a number"
          ).isInt({ min: 0, max: 50 }),
        ];
      }

      if (role === "inspection company") {
        validations = [
          check("contactPersonName", "Contact person name is required")
            .isString()
            .isLength({ min: 2 }),
          emailRule("companyEmail"),
          passwordRules(),
          countryCodeRule(),
          check("companyPhoneNumber", "Invalid company phone number").matches(
            /^\d{6,15}$/
          ),
          mobileRule(),
          check("companyName", "Company name is required")
            .isString()
            .isLength({ min: 2 }),
          check(
            "businessLicenseNumber",
            "License number is required"
          ).notEmpty(),
          check("companyAddress", "Address is required").isLength({ min: 5 }),
          check("website", "Invalid website URL").optional().isURL(),
          check("yearEstablished", "Invalid year").isInt({
            min: 1900,
            max: new Date().getFullYear(),
          }),
          check("employeeCount", "Invalid employee count").isIn([
            "1-10",
            "11-50",
            "51-200",
            "201-500",
            "500+",
          ]),
          check("servicesOffered", "Too long")
            .optional()
            .isLength({ max: 1000 }),
          check(
            "companyType",
            "Company type must be 'indian' or 'international'"
          ).isIn(["indian", "international"]),
          check("gstNumber", "Invalid GST number")
            .if(check("companyType").equals("indian"))
            .matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/),
          check("panNumber", "Invalid PAN number")
            .if(check("companyType").equals("indian"))
            .matches(/^[A-Z]{5}\d{4}[A-Z]{1}$/),
          check("cinNumber", "Invalid CIN number")
            .if(check("companyType").equals("indian"))
            .matches(/^[A-Z]{1}\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/),

          check("documents.businessLicense").custom((value, { req }) => {
            const fileExists = req.files?.businessLicense?.length > 0;
            if (!fileExists) {
              throw new Error("Business license document is required");
            }
            return true;
          }),

          check("documents.incorporationCertificate").custom(
            (value, { req }) => {
              const fileExists =
                req.files?.incorporationCertificate?.length > 0;
              if (!fileExists) {
                throw new Error("Incorporation certificate is required");
              }
              return true;
            }
          ),

          check("documents.insuranceDocument").custom((value, { req }) => {
            const fileExists = req.files?.insuranceDocument?.length > 0;
            if (!fileExists) {
              throw new Error("Insurance document is required");
            }
            return true;
          }),
        ];
      }

      Promise.all(validations.map((validation) => validation.run(req)))
        .then(() => next())
        .catch(next);
    },
  ];
};

const signInValidation = () => [
  emailRule(),
  check("password", "Password must be at least 8 characters").isLength({
    min: 8,
  }),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  handleValidationErrors,
  signUpValidation,
  signInValidation,
};
