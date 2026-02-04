const InspectionEnquiry = require("../../models/Customer/newCustomerEnquiryForm");
const Payment = require("../../models/Payment/paymentModel");
const Customer = require("../../models/Customer/customerModel");
const Bid = require("../../models/Inspector/bidModel");
const CompanyBid = require("../../models/InspectionCompany/companyBid");
const errorHandler = require("../../utils/errorHandler");
const sendEnquiryNotification = require("../../utils/EmailServices/sendEnquiryNotification");
const sendCustomerEnquiryConfirmation = require("../../utils/EmailServices/sendCustomerEnquiryConfirmation");

function countryLooksLikeIndia(countryStr) {
  if (!countryStr) return false;
  const c = String(countryStr).trim().toLowerCase();
  return c === "india" || c === "in" || c.includes("india");
}

const raiseEnquiryController = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can raise enquiries"));
    }

    const customer = await Customer.findById(req.user._id).select("name email mobileNumber countryCode gstVerified documents publishRequirements");
    if (!customer) return next(errorHandler(404, "Customer not found"));

    const isMissing = (val) => !val || typeof val !== "string" || val.trim().length === 0;

    const isIndianUser = customer.countryCode === "+91";
    const hasAnyDocument =
      !isMissing(customer.documents?.tradeLicense) ||
      !isMissing(customer.documents?.importExportCertificate);

      const isEligible = isIndianUser ? customer.gstVerified === true : hasAnyDocument;

    if (!isEligible) {
      return next(
        errorHandler(
          403,
          isIndianUser
            ? "Verify your registered GST number in Profile Section"
            : "Upload at least one legal document in Profile Section"
        )
      );
    }

    // const now = new Date();
    // const indiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    // const hour = indiaTime.getHours();
    // if (hour < 7 || hour >= 24) {
    //   return next(errorHandler(403, "Enquiries can only be raised between 7:00 AM and 12:00 AM IST"));
    // }

    const {
      location,
      locationLat,
      locationLng, 
      country,
      dateFrom,
      dateTo,
      urgency,
      category,
      subcategory, 
      commodity,
      volume,
      unit,
      inspectionBudget,
      physicalInspection,
      chemicalInspection,
      physicalInspectionParameters,
      chemicalInspectionParameters,
      services,
      certifications,
      selectionSummary,
      otherRequirements
    } = req.body;
     const attachmentFile = req.files?.attachment?.[0] || null;

    if (!physicalInspection && !chemicalInspection) {
      return next(errorHandler(400, "Select at least one inspection type"));
    }

    if (!dateFrom || !dateTo) {
      return next(errorHandler(400, "Both inspection dates are required"));
    }

    const budgetVal = Number(inspectionBudget || 0);
    if (budgetVal <= 0) {
      return next(errorHandler(400, "Inspection budget must be greater than zero"));
    }

    const currency = countryLooksLikeIndia(country) ? "INR" : "USD";

    const platformFee = Math.round(budgetVal * 0.3);

  const allowedUrgency = ["Low", "Medium", "High"];
const urgencyEnum = allowedUrgency.includes(urgency) ? urgency : "Medium";


    const allowedServices = ["pre-shipment", "loading", "stuffing"];
    const normalizedServices = Array.isArray(services)
      ? services.map((s) => String(s).toLowerCase()).filter((s) => allowedServices.includes(s))
      : [];

    const allowedCerts = ["COC", "ISO", "ECTN", "FOSFA", "NABCB", "NABL"];
    const normalizedCerts = Array.isArray(certifications)
      ? certifications.map((c) => String(c).toUpperCase()).filter((c) => allowedCerts.includes(c))
      : [];

    const enquiryData = {
      customer: req.user._id,
      location,
      locationLat,
      locationLng,
      country,
      dateFrom,
      dateTo,
      urgency: urgencyEnum,
      category,
      subcategory,
      commodity,
      volume: Number(volume),
      unit,
      inspectionBudget: budgetVal,
      platformFee,
      physicalInspection: !!physicalInspection,
      chemicalInspection: !!chemicalInspection,
      physicalInspectionParameters: physicalInspectionParameters || {},
      chemicalInspectionParameters: chemicalInspectionParameters || {},
      services: normalizedServices,
      certifications: normalizedCerts,
      selectionSummary: selectionSummary || "",
      status: "submitted",
      currentPhase: "initial", 
      currency,
      paymentPhases: [
        { phase: "initial", amount: Math.round(budgetVal * 0.3), status: "pending" },
        { phase: "inspection", amount: Math.round(budgetVal * 0.2), status: "pending" },
        { phase: "final", amount: Math.round(budgetVal * 0.5), status: "pending" },
      ],
         otherRequirements: otherRequirements || "",
      attachmentUrl: attachmentFile ? attachmentFile.path : null,
    };

    const newEnquiry = await InspectionEnquiry.create(enquiryData);
    const sanitized = newEnquiry.toObject();
    delete sanitized.platformFee;

    await sendEnquiryNotification(customer, sanitized);
    await sendCustomerEnquiryConfirmation(customer, sanitized);

    res.status(201).json({
      success: true,
      message: "Inspection enquiry raised successfully",
      enquiry: sanitized,
    });
  } catch (error) {
    console.error("Raise enquiry error:", error);
    next(errorHandler(500, "Failed to raise enquiry: " + error.message));
  }
};

const getMyEnquiries = async (req, res, next) => {
  try {
    const enquiries = await InspectionEnquiry.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .populate("confirmedBid");
    res.json({ success: true, enquiries });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch enquiries: " + error.message));
  }
};

const getEnquiryDetails = async (req, res, next) => {
  try {
    const enquiry = await InspectionEnquiry.findById(req.params.id).populate({
      path: "confirmedBid",
      populate: { path: "inspector", select: "name company email mobileNumber" },
    });

    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(404, "Enquiry not found or unauthorized"));
    }

    const payment = await Payment.findOne({ enquiry: enquiry._id, status: "paid" });

    res.json({ success: true, enquiry, bid: enquiry.confirmedBid, payment });
  } catch (err) {
    next(errorHandler(500, "Failed to fetch enquiry details"));
  }
};

const cancelEnquiry = async (req, res, next) => {
  try {
    const enquiry = await InspectionEnquiry.findById(req.params.enquiryId);
    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(403, "Unauthorized or enquiry not found"));
    }

    enquiry.status = "cancelled";
    await enquiry.save();

    res.json({ success: true, message: "Enquiry cancelled", enquiry });
  } catch (error) {
    next(errorHandler(500, "Failed to cancel enquiry: " + error.message));
  }
};

// const getBidsForEnquiry = async (req, res, next) => {
//   try {
//     const enquiry = await InspectionEnquiry.findById(req.params.enquiryId);
//     if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
//       return next(errorHandler(403, "Unauthorized or enquiry not found"));
//     }

//     const bids = await Bid.find({ enquiry: enquiry._id, status: { $in: ["active", "won"] } })
//       .populate("inspector", "name company rating inspectionsCount");

//        const companyBids = await CompanyBid.find({
//       enquiry: enquiry._id,
//       status: { $in: ["active", "won"] },
//     }).populate("inspectionCompany", "companyName companyEmail phoneNumber certificates");

//      const allBids = [
//       ...bids.map((b) => ({
//         ...b.toObject(),
//         bidderType: "inspector",
//       })),
//       ...companyBids.map((b) => ({
//         ...b.toObject(),
//         bidderType: "company",
//       })),
//     ];

//     const viewAmounts = allBids.map((b) => b.customerViewAmount);
//     const stats = {
//       lowestBid: Math.min(...viewAmounts),
//       highestBid: Math.max(...viewAmounts),
//       averageBid: viewAmounts.reduce((a, b) => a + b, 0) / viewAmounts.length,
//       totalBids: bids.length,
//     };

//     res.json({
//       success: true,
//       bids:allBids,
//       stats,
//       enquiry: {
//         status: enquiry.status,
//         currentPhase: enquiry.currentPhase,
//         _id: enquiry._id,
//         currency:enquiry.currency
//       },
//     });
//   } catch (error) {
//     next(errorHandler(500, "Failed to fetch bids: " + error.message));
//   }
// };

const getBidsForEnquiry = async (req, res, next) => {
  try {
    const enquiry = await InspectionEnquiry.findById(req.params.enquiryId);
    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(403, "Unauthorized or enquiry not found"));
    }

    const inspectorBids = await Bid.find({
      enquiry: enquiry._id,
      status: { $in: ["active", "won"] }
    }).populate("inspector", "name company rating inspectionsCount");



    const companyBids = await CompanyBid.find({
      enquiry: enquiry._id,
      status: { $in: ["active", "won"] }
    }).populate("inspectionCompany", "companyName companyEmail phoneNumber certificates");


    const allBids = [ 
      ...inspectorBids.map((b) => ({
        ...b.toObject(),
        bidderType: "inspector",
      })),
      ...companyBids.map((b) => ({
        ...b.toObject(),
        bidderType: "company",
      })),
    ];

    const viewAmounts = allBids.map((b) => b.customerViewAmount);
    const stats =
      viewAmounts.length > 0
        ? {
            lowestBid: Math.min(...viewAmounts),
            highestBid: Math.max(...viewAmounts),
            averageBid: viewAmounts.reduce((a, b) => a + b, 0) / viewAmounts.length,
            totalBids: allBids.length,
          }
        : { lowestBid: null, highestBid: null, averageBid: null, totalBids: 0 };

    res.json({
      success: true,
      bids: allBids,
      stats,
      enquiry: {
        status: enquiry.status,
        currentPhase: enquiry.currentPhase,
        _id: enquiry._id,
        currency: enquiry.currency,
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch bids: " + error.message));
  }
};

const confirmBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate("enquiry");
    if (!bid || bid.enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(403, "Unauthorized or bid not found"));
    }

    if (bid.status !== "active") {
      return next(errorHandler(400, "Only active bids can be confirmed"));
    }

    bid.status = "won";
    await bid.save();

    await Bid.updateMany(
      { enquiry: bid.enquiry._id, _id: { $ne: bid._id }, status: "active" },
      { $set: { status: "lost" } }
    );

    bid.enquiry.confirmedBid = bid._id;
    bid.enquiry.status = "completed";
    await bid.enquiry.save();

    res.json({ success: true, message: "Bid confirmed", bid });
  } catch (error) {
    next(errorHandler(500, "Failed to confirm bid: " + error.message));
  }
};

const updateCustomerDocumentsController = async (req, res, next) => {

  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can update documents"));
    }

    const updates = {};
    if (req.files?.tradeLicense?.[0]?.path) {
      updates["documents.tradeLicense"] = req.files.tradeLicense[0].path;
    }
    if (req.files?.importExportCertificate?.[0]?.path) {
      updates["documents.importExportCertificate"] =
        req.files.importExportCertificate[0].path;
    }

    if (Object.keys(updates).length === 0) {
      return next(errorHandler(400, "No documents uploaded"));
    }

    const customer = await Customer.findById(req.user._id).select(
      "documents publishRequirements"
    );

    const tradeLicense =
      updates["documents.tradeLicense"] || customer.documents?.tradeLicense;
    const importExportCertificate =
      updates["documents.importExportCertificate"] ||
      customer.documents?.importExportCertificate;

    if (tradeLicense) {
      updates.publishRequirements = true;
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("name email documents publishRequirements");

    res.status(200).json({
      success: true,
      message: "Documents updated successfully",
      documents: updatedCustomer.documents,
      publishRequirements: updatedCustomer.publishRequirements,
      customer:updatedCustomer
    });
  } catch (error) {
    next(errorHandler(500, "Failed to update documents: " + error.message));
  }
};

const updateCustomerGSTController = async (req, res, next) => {
  try {
    const { gstNumber } = req.body;

    if (!gstNumber) {
      return next(errorHandler(400, "GST number is required"));
    }

    const existing = await Customer.findOne({
      gstNumber,
      _id: { $ne: req.user._id },
    });

    if (existing) {
      return next(
        errorHandler(400, "GST number already linked to another account")
      );
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.user._id,
      {
        gstNumber,
        gstVerified: true,
        publishRequirements: true,
      },
      { new: true, runValidators: true }
    ).select("-password -refreshToken -__v");

    res.status(200).json({
      success: true,
      message: "GST details saved successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    next(errorHandler(500, error.message));
  }
};

const getCustomerPayments = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can view payment history"));
    }

    const payments = await Payment.find({
      customer: req.user._id,
      status: "paid",
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "enquiry",
        select: "subcategory commodity location volume unit status inspectionBudget",
      })
      

    res.json({ success: true, payments });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch payment history"));
  }
};

const getCustomerAnalysis = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can access analysis"));
    }

    const customerId = req.user._id;

    const customer = await Customer.findById(customerId).select(
      "name email mobileNumber country"
    );

    const totalEnquiries = await InspectionEnquiry.countDocuments({
      customer: customerId,
    });
    const completedInspections = await InspectionEnquiry.countDocuments({
      customer: customerId,
      status: "completed",
    });
    const pendingInspections = await InspectionEnquiry.countDocuments({
      customer: customerId,
      status: { $ne: "completed" },
    });
    const completionRate =
      totalEnquiries > 0
        ? Math.round((completedInspections / totalEnquiries) * 100)
        : 0;

    const payments = await Payment.find({ customer: customerId });
    const paidPayments = payments.filter((p) => p.status === "paid");
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayment = payments
      .filter((p) => p.status !== "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const averagePayment =
      paidPayments.length > 0 ? Math.round(totalPaid / paidPayments.length) : 0;
    const paymentSuccessRate =
      payments.length > 0
        ? Math.round((paidPayments.length / payments.length) * 100)
        : 0;

    const paymentTimeline = payments.map((p) => ({
      amount: p.amount,
      status: p.status,
      date: p.updatedAt,
    }));

    const enquiries = await InspectionEnquiry.find({ customer: customerId }).select("status createdAt");
    const enquiryTimeline = enquiries.map(e => ({
      status: e.status,
      date: e.createdAt,
    }));

    return res.status(200).json({
      success: true,
      customer,
      stats: {
        totalEnquiries,
        completedInspections,
        pendingInspections,
        completionRate,
        totalPaid,
        pendingPayment,
        averagePayment,
        paymentSuccessRate,
        paymentTimeline,
        enquiryTimeline,
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to generate analysis: " + error.message));
  }
};

const getWonInspectors = async (req, res, next) => {
  try {
    const customerId = req.user._id;

    const wonInspectorBids = await Bid.find({ status: "won" })
      .populate({
        path: "enquiry",
        match: { customer: customerId },
        select: "commodity",
      })
      .populate("inspector", "name email mobileNumber");

       const wonCompanyBids = await CompanyBid.find({ status: "won" })
      .populate({
        path: "enquiry",
        match: { customer: customerId },
        select: "commodity",
      })
      .populate("inspectionCompany", "companyName companyEmail phoneNumber");

      const validInspectorBids = wonInspectorBids.filter((b) => b.enquiry);
    const validCompanyBids = wonCompanyBids.filter((b) => b.enquiry);

    const participants  = [];

     for (const bid of validInspectorBids) {
      const inspector = bid.inspector;
      const enquiry = bid.enquiry;
      if (!inspector || !enquiry) continue;

      const initialPayment = await Payment.findOne({
        enquiry: enquiry._id,
        phase: "initial",
        status: "paid",
      }).lean();

      participants.push({
        id: String(inspector._id),
        name: inspector.name || "Inspector",
        email: inspector.email || null,
        mobileNumber: inspector.mobileNumber || null,
        commodity: enquiry.commodity || null,
        orderId: initialPayment?.razorpayOrderId || `order_${String(enquiry._id)}`,
        amount: initialPayment?.amount || 0,
        type: "inspector",
      });
    }

     for (const bid of validCompanyBids) {
      const company = bid.inspectionCompany;
      const enquiry = bid.enquiry;
      if (!company || !enquiry) continue;

      const initialPayment = await Payment.findOne({
        enquiry: enquiry._id,
        phase: "initial",
        status: "paid",
      }).lean();

      participants.push({
        id: String(company._id),
        name: company.companyName || company.name || "Inspection Company",
        email: company.companyEmail || null,
        mobileNumber: company.phoneNumber || null,
        commodity: enquiry.commodity || null,
        orderId: initialPayment?.razorpayOrderId || `order_${String(enquiry._id)}`,
        amount: initialPayment?.amount || 0,
        type: "company",
      });
    }

        participants.sort((a, b) => (String(a.name || "").localeCompare(String(b.name || ""))));

    res.status(200).json({
      success: true,
      inspectors:participants,
    });
  } catch (error) {
    next({
      status: 500,
      message: "Failed to fetch inspectors: " + error.message,
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const customerId = req.user._id;

    const totalInspections = await InspectionEnquiry.countDocuments({
      customer: customerId,
    });
    const activeOrders = await InspectionEnquiry.countDocuments({
      customer: customerId,
      status: { $ne: "completed" },
    });
    const completedTasks = await InspectionEnquiry.countDocuments({
      customer: customerId,
      status: "completed",
    });

    const totalValueAgg = await Payment.aggregate([
      { $match: { customer: customerId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalValue = totalValueAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalInspections,
        activeOrders,
        completedTasks,
        totalValue,
        growthRate: "+8%",
        urgentRequests: 0,
        successRate: "98.5%",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  raiseEnquiryController,
  getMyEnquiries,
  getBidsForEnquiry,
  confirmBid,
  cancelEnquiry,
  updateCustomerDocumentsController,
  getEnquiryDetails,
  getCustomerPayments,
  getCustomerAnalysis,
  getWonInspectors,
  getDashboardStats,
  updateCustomerGSTController
};
