const { check,body, validationResult } = require("express-validator");

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
      "inspection_company",
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
          check("wantsKyc").optional().isBoolean(),
check("panNumber")
  .optional()
  .custom((val, { req }) => {
    const wants = req.body.wantsKyc === "true" || req.body.wantsKyc === true;
    if (wants && !val) throw new Error("PAN is required for KYC");
    if (val && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(val)) throw new Error("Invalid PAN format");
    return true;
  }),
check("gstNumber")
  .optional()
  .custom((val, { req }) => {
    const wants = req.body.wantsKyc === "true" || req.body.wantsKyc === true;
    if (wants && !val) throw new Error("GST is required for KYC");
    if (val && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(val)) throw new Error("Invalid GST format");
    return true;
  }),
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

if (role === "inspection_company") {
  validations = [
    check("companyName", "Company name is required").isString().isLength({ min: 2 }),
    check("companyEmail", "Invalid email").isEmail(),
    passwordRules(),
    check("phoneNumber", "Invalid company phone number").matches(/^\d{6,15}$/),
    mobileRule("mobileNumber"),
    check("firstName", "Contact first name is required").isString().isLength({ min: 1 }),
    check("lastName", "Contact last name is required").isString().isLength({ min: 1 }),

    check("publishRequirements").optional().toBoolean().isBoolean(),

    body("licenseNumber").custom((val, { req }) => {
      const pub = req.body.publishRequirements === "true" || req.body.publishRequirements === true;
      if (pub && (!val || String(val).trim().length < 6)) {
        throw new Error("License number must be at least 6 characters");
      }
      return true;
    }),

    body().custom((_, { req }) => {
      const pub = req.body.publishRequirements === "true" || req.body.publishRequirements === true;
      if (pub) {
        const inc = req.files?.incorporationCertificate?.length > 0;
        if (!inc) throw new Error("Incorporation certificate is required when publishing requirements");
      }
      return true;
    }),

check("websiteUrl")
  .optional({ checkFalsy: true })
  .matches(/^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\/\w .-]*)*\/?$/)
  .withMessage("Invalid website URL"),


    body("certificates").custom((val) => {
      try {
        const arr = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(arr)) throw new Error("Certificates must be an array");
        if (arr.length < 1) throw new Error("Please select at least one certificate");
        if (arr.length > 5) throw new Error("You can only select up to 5 certificates");
        return true;
      } catch (e) {
        throw new Error(e.message || "Invalid certificates payload");
      }
    }),

    check("panNumber").optional().matches(/^[A-Z]{5}\d{4}[A-Z]{1}$/).withMessage("Invalid PAN number"),
    check("gstNumber").optional().matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/).withMessage("Invalid GST number")
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

// const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors: errors.array(),
//     });
//   }
//   next();
// };

const handleValidationErrors = (req, res, next) => {
  if (req.files) {
    const filesSummary = Object.keys(req.files).reduce((acc, key) => {
      acc[key] = req.files[key].map((f) => ({ originalname: f.originalname, fieldname: f.fieldname, size: f.size }));
      return acc;
    }, {});
  } else {
    console.log("Files: none");
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    const first = errorArray[0];
    return res.status(400).json({
      success: false,
      message: first.msg || "Validation failed",
      errors: errorArray,
    });
  }
  next();
};

module.exports = {
  handleValidationErrors,
  signUpValidation,
  signInValidation,
};
