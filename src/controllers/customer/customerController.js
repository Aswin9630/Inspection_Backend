const InspectionEnquiry = require("../../models/Customer/newCustomerEnquiryForm");
const Payment = require("../../models/Payment/paymentModel");
const Customer = require("../../models/Customer/customerModel");
const Bid = require("../../models/Inspector/bidModel");
const errorHandler = require("../../utils/errorHandler");
const sendEnquiryNotification = require("../../utils/EmailServices/sendEnquiryNotification");
const sendCustomerEnquiryConfirmation = require("../../utils/EmailServices/sendCustomerEnquiryConfirmation");

const raiseEnquiryController5 = async (req, res, next) => { 
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can raise enquiries"));
    }

    const customer = await Customer.findById(req.user._id).select(
      "name email mobileNumber publishRequirements documents"
    );

    if (!customer) {
      return next(errorHandler(404, "Customer not found"));
    }

    const isMissing = (value) =>
      !value || typeof value !== "string" || value.trim().length === 0;

    if (
      isMissing(customer.documents?.tradeLicense) ||
      isMissing(customer.documents?.importExportCertificate)
    ) {
      return next(
        errorHandler(
          403,
          "You must upload both Trade License and Import Export Certificate before raising an enquiry"
        )
      );
    }

    const now = new Date();
    const indiaTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const hour = indiaTime.getHours();

    const isBusinessHour = hour >= 9 && hour < 23;

    if (!isBusinessHour) {
      return next(
        errorHandler(
          403,
          "Enquiries can only be raised between 9:00 AM and 11:00 PM IST"
        )
      );
    }

    const { inspectionTypes, physicalParameters, chemicalParameters, ...rest } =
      req.body;

    const isPhysical = inspectionTypes?.physical === true;
    const isChemical = inspectionTypes?.chemical === true;

    if (!isPhysical && !isChemical) {
      return next(
        errorHandler(
          400,
          "You must select at least one inspection type: physical or chemical"
        )
      );
    }

    const customerBudget = Number(rest.inspectionBudget) || 0;
    if (customerBudget <= 0) {
      return next(
        errorHandler(400, "Inspection budget must be greater than zero")
      );
    }

    const platformFee = Math.round(customerBudget * 0.3);

    const enquiryData = {
      ...rest,
      customer: req.user._id,
      contact: {
        name: customer.name,
        email: customer.email,
        phoneNumber: customer.mobileNumber,
      },
      inspectionTypes: {
        physical: inspectionTypes?.physical || false,
        chemical: inspectionTypes?.chemical || false,
      },
      platformFee,
      paymentPhases: [
        {
          phase: "initial",
          amount: Math.round(customerBudget * 0.3),
          status: "pending",
        },
        {
          phase: "inspection",
          amount: Math.round(customerBudget * 0.2),
          status: "pending",
        },
        {
          phase: "final",
          amount: Math.round(customerBudget * 0.5),
          status: "pending",
        },
      ],
      currentPhase: "initial",
    };

    if (inspectionTypes?.physical) {
      enquiryData.physicalParameters = physicalParameters;
    }

    if (inspectionTypes?.chemical) {
      enquiryData.chemicalParameters = chemicalParameters;
    }

    const newEnquiry = await InspectionEnquiry.create(enquiryData);

    const { platformFee: _platformFee, ...sanitizedEnquiry } =
      newEnquiry.toObject();

    await sendEnquiryNotification(customer, sanitizedEnquiry);
    await sendCustomerEnquiryConfirmation(customer, sanitizedEnquiry);

    res.status(201).json({
      success: true,
      message: "Inspection enquiry raised successfully",
      enquiry: sanitizedEnquiry,
    });
  } catch (error) {
    next(errorHandler(500, "Failed to raise enquiry: " + error.message));
  }
};

const getMyEnquiries5 = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can view their enquiries"));
    }

    const enquiries = await InspectionEnquiry.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .populate("confirmedBid");

    res.json({ success: true, enquiries });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch enquiries: " + error.message));
  }
};

const getBidsForEnquiry5 = async (req, res, next) => {
  try {
    const { enquiryId } = req.params;

    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || String(enquiry.customer) !== String(req.user._id)) {
      return next(errorHandler(403, "Unauthorized or enquiry not found"));
    }

    const bids = await Bid.find({
      enquiry: enquiryId,
      status: { $in: ["active", "won"] },
    }).populate("inspector", "name company rating inspectionsCount");

    const viewAmounts = bids.map((b) => b.customerViewAmount);
    const stats = {
      lowestBid: Math.min(...viewAmounts),
      highestBid: Math.max(...viewAmounts),
      averageBid: viewAmounts.reduce((a, b) => a + b, 0) / viewAmounts.length,
      totalBids: bids.length,
    };

    res.json({
      success: true,
      bids,
      stats,
      enquiry: {
        status: enquiry.status,
        currentPhase: enquiry.currentPhase,
        _id: enquiry._id,
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch bids: " + error.message));
  }
};

const confirmBid5 = async (req, res, next) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId).populate("enquiry");
    if (!bid || String(bid.enquiry.customer) !== String(req.user._id)) {
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

const cancelEnquiry5 = async (req, res, next) => {
  try {
    const { enquiryId } = req.params;

    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || String(enquiry.customer) !== String(req.user._id)) {
      return next(errorHandler(403, "Unauthorized or enquiry not found"));
    }

    enquiry.status = "cancelled";
    await enquiry.save();

    res.json({ success: true, message: "Enquiry cancelled", enquiry });
  } catch (error) {
    next(errorHandler(500, "Failed to cancel enquiry: " + error.message));
  }
};

const getEnquiryDetails5 = async (req, res, next) => {
  try {
    const enquiry = await InspectionEnquiry.findById(req.params.id).populate({
      path: "confirmedBid",
      populate: {
        path: "inspector",
        select: "name company email mobileNumber",
      },
    });

    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(404, "Enquiry not found or unauthorized"));
    }

    const payment = await Payment.findOne({
      enquiry: enquiry._id,
      status: "paid",
    });

    res.json({
      success: true,
      enquiry,
      bid: enquiry.confirmedBid,
      payment,
    });
  } catch (err) {
    next(errorHandler(500, "Failed to fetch enquiry details"));
  }
};

const raiseEnquiryController = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can raise enquiries"));
    }

    const customer = await Customer.findById(req.user._id).select("name email mobileNumber documents publishRequirements");
    if (!customer) return next(errorHandler(404, "Customer not found"));

    const isMissing = (val) => !val || typeof val !== "string" || val.trim().length === 0;
    if (isMissing(customer.documents?.tradeLicense) || isMissing(customer.documents?.importExportCertificate)) {
      return next(errorHandler(403, "Upload Trade License and Import Export Certificate in Account section"));
    }

    const now = new Date();
    const indiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const hour = indiaTime.getHours();
    if (hour < 7 || hour >= 24) {
      return next(errorHandler(403, "Enquiries can only be raised between 7:00 AM and 12:00 AM IST"));
    }

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
    } = req.body;
    console.log("req", req.body);
    

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
      paymentPhases: [
        { phase: "initial", amount: Math.round(budgetVal * 0.3), status: "pending" },
        { phase: "inspection", amount: Math.round(budgetVal * 0.2), status: "pending" },
        { phase: "final", amount: Math.round(budgetVal * 0.5), status: "pending" },
      ],
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

const getBidsForEnquiry = async (req, res, next) => {
  try {
    const enquiry = await InspectionEnquiry.findById(req.params.enquiryId);
    if (!enquiry || enquiry.customer.toString() !== req.user._id.toString()) {
      return next(errorHandler(403, "Unauthorized or enquiry not found"));
    }

    const bids = await Bid.find({ enquiry: enquiry._id, status: { $in: ["active", "won"] } })
      .populate("inspector", "name company rating inspectionsCount");

    const viewAmounts = bids.map((b) => b.customerViewAmount);
    const stats = {
      lowestBid: Math.min(...viewAmounts),
      highestBid: Math.max(...viewAmounts),
      averageBid: viewAmounts.reduce((a, b) => a + b, 0) / viewAmounts.length,
      totalBids: bids.length,
    };

    res.json({
      success: true,
      bids,
      stats,
      enquiry: {
        status: enquiry.status,
        currentPhase: enquiry.currentPhase,
        _id: enquiry._id,
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

    if (tradeLicense && importExportCertificate) {
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
    });
  } catch (error) {
    next(errorHandler(500, "Failed to update documents: " + error.message));
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

    const wonBids = await Bid.find({ status: "won" })
      .populate({
        path: "enquiry",
        match: { customer: customerId },
        select: "commodity",
      })
      .populate("inspector", "name email mobileNumber");

    const validBids = wonBids.filter((bid) => bid.enquiry);

    const inspectors = [];

    for (const bid of validBids) {
      const inspector = bid.inspector;
      const enquiry = bid.enquiry;

      if (inspector && enquiry) {
        const initialPayment = await Payment.findOne({
          enquiry: enquiry._id,
          phase: "initial",
          status: "paid",
        });

        inspectors.push({
          id: inspector._id,
          name: inspector.name,
          email: inspector.email,
          mobileNumber: inspector.mobileNumber,
          commodity: enquiry.commodity,
          orderId: initialPayment?.razorpayOrderId || "Not available",
          amount: initialPayment?.amount || 0,
        });
      }
    }

    res.status(200).json({
      success: true,
      inspectors,
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
};
