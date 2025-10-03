const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendVerificationEmail = require("../../utils/sendVerificationEmail");
const Customer = require("../../models/Customer/customerModel");
const Inspector = require("../../models/Inspector/inspectorModel");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
const errorHandler = require("../../utils/errorHandler");
const generateTokenAndCookie = require("../../middleware/generateTokenAndCookie");

const signUpController = async (req, res, next) => {
  try {
    const { role } = req.body;

    const validRoles = ["customer", "inspector", "inspection company"];
    if (!role || !validRoles.includes(role)) {
      return next(
        errorHandler(
          400,
          "Invalid role. Must be customer, inspector, or inspection company."
        )
      );
    }

    let userData;
    switch (role) {
      case "customer": {
        const {
          name,
          email,
          password,
          address,
          countryCode,
          mobileNumber,
          publishRequirements,
        } = req.body;

        if (!name || !email || !password || !countryCode || !mobileNumber) {
          return next(errorHandler(400, "Missing required customer fields"));
        }
        const documents = {
          tradeLicense: req.files?.tradeLicense?.[0]?.path || "",
          importExportCertificate:
            req.files?.importExportCertificate?.[0]?.path || "",
        };

        if (
          publishRequirements === "true" &&
          (!documents?.tradeLicense || !documents?.importExportCertificate)
        ) {
          return next(
            errorHandler(400, "Documents required to publish requirements")
          );
        }

        userData = {
          name,
          email,
          password,
          address,
          countryCode,
          mobileNumber,
          publishRequirements: publishRequirements === "true",
          documents,
          role,
        };
        break;
      }

      case "inspector": {
        const {
          name,
          email,
          password,
          address,
          countryCode,
          mobileNumber,
          inspectorType,
          acceptsRequests,
          commodities,
          accountNumber,
          bankName,
          ifscCode,
        } = req.body;

        if (
          !name ||
          !email ||
          !password ||
          !countryCode ||
          !mobileNumber ||
          !inspectorType
        ) {
          return next(errorHandler(400, "Missing required inspector fields"));
        }
        const identityDocuments = {
          aadhaarCard: req.files?.aadhaarCard?.[0]?.path || null,
        };

        const billingDetails = {
          accountNumber:
            accountNumber && accountNumber.trim() !== ""
              ? accountNumber.trim()
              : null,
          bankName: bankName && bankName.trim() !== "" ? bankName.trim() : null,
          ifscCode: ifscCode && ifscCode.trim() !== "" ? ifscCode.trim() : null,
        };

        if (
          acceptsRequests === "true" &&
          (!identityDocuments?.aadhaarCard ||
            !accountNumber ||
            accountNumber.trim() === "" ||
            !bankName ||
            bankName.trim() === "" ||
            !ifscCode ||
            ifscCode.trim() === "")
        ) {
          return next(
            errorHandler(
              400,
              "Documents and billing details required to accept requests"
            )
          );
        }

        userData = {
          name,
          email,
          password,
          address,
          countryCode,
          mobileNumber,
          inspectorType,
          acceptsRequests: acceptsRequests === "true",
          identityDocuments,
          billingDetails,
          commodities,
          role,
        };
        break;
      }

      case "inspection company": {
        const {
          contactPersonName,
          companyEmail,
          password,
          countryCode,
          companyPhoneNumber,
          mobileNumber,
          companyName,
          businessLicenseNumber,
          companyAddress,
          website,
          yearEstablished,
          employeeCount,
          servicesOffered,
          companyType,
          gstNumber,
          panNumber,
          cinNumber,
          msmeNumber,
        } = req.body;

        if (
          !contactPersonName ||
          !companyEmail ||
          !password ||
          !countryCode ||
          !companyPhoneNumber ||
          !mobileNumber ||
          !companyName ||
          !businessLicenseNumber ||
          !companyAddress ||
          !yearEstablished ||
          !employeeCount ||
          !companyType
        ) {
          return next(errorHandler(400, "Missing required company fields"));
        }

        const documents = {
          businessLicense: req.files?.businessLicense?.[0]?.path || null,
          incorporationCertificate:
            req.files?.incorporationCertificate?.[0]?.path || null,
          insuranceDocument: req.files?.insuranceDocument?.[0]?.path || null,
        };
        if (
          !documents.businessLicense ||
          !documents.incorporationCertificate ||
          !documents.insuranceDocument
        ) {
          return next(errorHandler(400, "Missing required company documents"));
        }

        if (
          companyType === "indian" &&
          (!gstNumber || !panNumber || !cinNumber)
        ) {
          return next(
            errorHandler(400, "Indian company must provide GST, PAN, and CIN")
          );
        }

        userData = {
          contactPersonName,
          companyEmail,
          password,
          countryCode,
          companyPhoneNumber,
          mobileNumber,
          companyName,
          businessLicenseNumber,
          companyAddress,
          website,
          yearEstablished,
          employeeCount,
          servicesOffered: Array.isArray(servicesOffered)
            ? servicesOffered
            : [servicesOffered],
          companyType,
          gstNumber,
          panNumber,
          cinNumber,
          msmeNumber,
          documents,
          role,
        };
        break;
      }
    }

    const Model =
      role === "customer"
        ? Customer
        : role === "inspector"
        ? Inspector
        : InspectionCompany;

    const emailField = role === "inspection company" ? "companyEmail" : "email";
    const emailExist = await Model.findOne({
      [emailField]: userData[emailField],
    });
    if (emailExist) return next(errorHandler(400, "Email already exists"));

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    userData.password = hashedPassword;

    const token = crypto.randomBytes(32).toString("hex");
    userData.emailVerificationToken = token;
    userData.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    userData.isVerified = false;

    const newUser = await Model.create(userData);

    await sendVerificationEmail(
      userData[emailField],
      userData.name || userData.contactPersonName,
      token,
      role
    );
 
    const { password: _ignored, ...userDetails } = newUser._doc;

    return res.status(201).json({
      success: true,
      message: "Signup successful. Please verify your email to activate your account.",
      user: userDetails,
    });

  } catch (error) {
    return next(errorHandler(500, error.message));
  }
};

const signInController = async (req, res, next) => {
  try {
    const { role, email, password } = req.body;

    const validRoles = ["customer", "inspector", "inspection company"];
    if (!role || !validRoles.includes(role)) {
      return next(
        errorHandler(
          400,
          "Invalid role. Must be customer, inspector, or inspection company."
        )
      );
    }

    if (!email || !password) {
      return next(errorHandler(400, "Email and password are required"));
    }

    const Model =
      role === "customer"
        ? Customer
        : role === "inspector"
        ? Inspector
        : InspectionCompany;

    const emailField = role === "inspection company" ? "companyEmail" : "email";

    const user = await Model.findOne({ [emailField]: email }).select(
      "+password"
    );
    if (!user) return next(errorHandler(401, "Invalid credentials"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(errorHandler(401, "Invalid credentials"));

    if (!user.isVerified) {
      return next(errorHandler(403, "Please verify your email before signing in"));
    }

    token = generateTokenAndCookie(res, user);

    const { password: _ignored, ...userDetails } = user._doc;

    return res.status(200).json({
      success: true,
      message: "Signin successful",
      user: userDetails,
      token,
    });
  } catch (error) {
    return next(errorHandler(500, error.message));
  }
};

const logoutController = (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next({
      statusCode: 500,
      message: "Logout failed: " + error.message,
    });
  }
};

const getUserProfileController = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(errorHandler(401, "User not authenticated"));
    }

    const { password, ...userDetails } = req.user._doc;

    res.status(200).json({
      success: true,
      userInfo: userDetails,
    });
  } catch (error) {
    return next(errorHandler(400, error.message));
  }
};

module.exports = {
  signInController,
  signUpController,
  logoutController,
  getUserProfileController,
};
