const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendVerificationEmail,transporter } = require("../../utils/sendVerificationEmail");
const Customer = require("../../models/Customer/customerModel");
const Inspector = require("../../models/Inspector/inspectorModel");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
const errorHandler = require("../../utils/errorHandler");
const generateTokenAndCookie = require("../../middleware/generateTokenAndCookie");
// const { verifyPan, verifyGst } = require("../../config/sandboxClient");

const signUpController = async (req, res, next) => {
  try {
    const { role } = req.body;

    const validRoles = ["customer", "inspector",  "inspection_company"];
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
          // panNumber,
          // gstNumber,
          // wantsKyc,
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

        // let kycStatus = "none";
        // if (wantsKyc === "true" || wantsKyc === true) {
        //   try {
        //     await verifyPan(panNumber);
        //     await verifyGst(gstNumber);
        //     kycStatus = "verified";
        //   } catch (e) {
        //     return next(
        //       errorHandler(400, e.message || "KYC verification failed")
        //     );
        //   }
        // }

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
          // panNumber: panNumber || null,
          // gstNumber: gstNumber || null,
          // kycStatus,
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

      case "inspection_company": {
        const {
          companyName,
        companyEmail,
        firstName,
        lastName,
        password,
        phoneNumber,
        mobileNumber,
        licenseNumber,
        websiteUrl,
        publishRequirements,
        certificates,
        // panNumber,
        // gstNumber
        } = req.body;

       if (!companyName  || !companyEmail || !password || !phoneNumber || !mobileNumber || !firstName || !lastName) {
        return next(errorHandler(400, "Missing required company fields"));
      }

             const incorporationCertificate = req.files?.incorporationCertificate?.[0]?.path || null;
  const pub = publishRequirements === "true" || publishRequirements === true;
  if (pub && (!licenseNumber || !incorporationCertificate)) {
    return next(errorHandler(400, "License number and legal certificate are required when publishing requirements"));
  }

      let parsedCertificates = [];
      try {
        parsedCertificates = typeof certificates === "string" ? JSON.parse(certificates) : (certificates || []);
      } catch (e) {
        parsedCertificates = [];
      }

           userData = {
        role: "inspection_company",
        companyName,
        phoneNumber,
        mobileNumber,
        companyEmail,
        password,
        firstName,
        lastName,
        licenseNumber: pub ? licenseNumber || null : null,
        websiteUrl: websiteUrl || null,
        publishRequirements: pub,
        certificates: parsedCertificates || [],
             documents: pub ? { incorporationCertificate, businessLicense: null } : undefined,
        // panNumber: panNumber || null,
        // gstNumber: gstNumber || null,
        // kycStatus: "none"
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

    const emailField = role === "inspection_company" ? "companyEmail" : "email";
    const emailValue = userData[emailField];

     if (!emailValue) {
      return next(errorHandler(400, "Email is required"));
    }

    const emailExist = await Model.findOne({
      [emailField]:emailValue
    });
    if (emailExist) return next(errorHandler(400, "Email already exists"));

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    userData.password = hashedPassword;

    const token = crypto.randomBytes(32).toString("hex");
    userData.emailVerificationToken = token;
    userData.verificationExpires = Date.now() + 60 * 60 * 1000;
    userData.isVerified = false;

    const newUser = await Model.create(userData);

        const displayName = userData.companyName || userData.name || `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "User";
    await sendVerificationEmail(
      emailValue, displayName, token, role
    );

    const { password: _ignored, ...userDetails } = newUser._doc;

    return res.status(201).json({
      success: true,
      message:
        "Signup successful. Please verify your email to activate your account.",
      user: userDetails,
    });
  } catch (error) {
    return next(errorHandler(500, error.message));
  }
};

// const signInController = async (req, res, next) => {
//   try {
//     const { role, email, password } = req.body;

//     const validRoles = ["customer", "inspector", "inspection_company"];
//     if (!role || !validRoles.includes(role)) {
//       return next(
//         errorHandler(
//           400,
//           "Invalid role. Must be customer, inspector, or inspection company."
//         )
//       );
//     }

//     if (!email || !password) {
//       return next(errorHandler(400, "Email and password are required"));
//     }

//     const Model =
//       role === "customer"
//         ? Customer
//         : role === "inspector"
//         ? Inspector
//         : InspectionCompany;

//     const emailField = role === "inspection company" ? "companyEmail" : "email";

//     const user = await Model.findOne({ [emailField]: email }).select(
//       "+password"
//     );
//     if (!user) return next(errorHandler(401, "Invalid credentials"));

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return next(errorHandler(401, "Invalid credentials"));

//     if (!user.isVerified) {
//       return next(
//         errorHandler(403, "Please verify your email before signing in")
//       );
//     }

//     token = generateTokenAndCookie(res, user);

//     const { password: _ignored, ...userDetails } = user._doc;

//     return res.status(200).json({
//       success: true,
//       message: "Signin successful",
//       user: userDetails,
//       token,
//     });
//   } catch (error) {
//     return next(errorHandler(500, error.message));
//   }
// };

const signInController = async (req, res, next) => {
  try {
    const { role, email, password } = req.body;

    const validRoles = ["customer", "inspector", "inspection_company"];
    if (!role || !validRoles.includes(role)) {
      return next(errorHandler(400, "Invalid role. Must be customer, inspector, or inspection_company."));
    }

    if (!email || !password) {
      return next(errorHandler(400, "Email and password are required"));
    }

    // pick model by canonical role
    const Model = role === "customer" ? Customer : role === "inspector" ? Inspector : InspectionCompany;

    // use companyEmail for inspection_company, otherwise email
    const emailField = role === "inspection_company" ? "companyEmail" : "email";

    const user = await Model.findOne({ [emailField]: email }).select("+password");
    if (!user) return next(errorHandler(401, "Invalid credentials"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(errorHandler(401, "Invalid credentials"));

    if (!user.isVerified) {
      return next(errorHandler(403, "Please verify your email before signing in"));
    }

    const token = generateTokenAndCookie(res, user);

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

const findNameById = async (id) => {
  let u = await Customer.findById(id).select("name email").lean();
  if (u)
    return { displayName: u.name || u.email || null, role: "customer", raw: u };

  u = await Inspector.findById(id).select("name email").lean();
  if (u)
    return {
      displayName: u.name || u.email || null,
      role: "inspector",
      raw: u,
    };

  return null;
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(errorHandler(400, "Invalid user id"));
    }

    const found = await findNameById(id);
    if (!found) return next(errorHandler(404, "User not found"));

    return res.status(200).json({
      success: true,
      user: {
        _id: id,
        displayName: found.displayName,
        role: found.role,
      },
    });
  } catch (err) {
    return next(err);
  }
};


const getModelByRole = (role) => {
  if (role === "customer") return Customer;
  if (role === "inspector") return Inspector;
  if (role === "inspection_company") return InspectionCompany;
  return null;
};

const forgotPasswordController = async (req, res, next) => {
  try {
    const { role, email } = req.body;
    if (!role || !email) return next(errorHandler(400, "Role and email required"));

    const Model = getModelByRole(role);
    if (!Model) return next(errorHandler(400, "Invalid role"));

    const emailField = role === "inspection_company" ? "companyEmail" : "email";
    const user = await Model.findOne({ [emailField]: email });
    if (!user) return next(errorHandler(404, "User not found"));

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; 
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}?role=${role}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Qualty.ai Password Reset",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name || user.companyName},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="color:#2563EB;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });
 
    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    next(errorHandler(500, err.message));
  }
};

const resetPasswordController = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { role, password } = req.body;
    if (!role || !password) return next(errorHandler(400, "Role and new password required"));

    const Model = getModelByRole(role);
    if (!Model) return next(errorHandler(400, "Invalid role"));

    const user = await Model.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return next(errorHandler(400, "Invalid or expired token"));

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    next(errorHandler(500, err.message));
  }
};

module.exports = {
  signInController,
  signUpController,
  logoutController,
  getUserProfileController,
  getUserById,
  resetPasswordController,
  forgotPasswordController
};
