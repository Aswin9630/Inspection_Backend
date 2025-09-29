const InspectionEnquiry = require("../../models/Customer/customerEnquiryForm");
const Customer = require("../../models/Customer/customerModel");
const Bid = require("../../models/Inspector/bidModel");
const errorHandler = require("../../utils/errorHandler");

const raiseEnquiryController = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Only customers can raise enquiries"));
    }

    const customer = await Customer.findById(req.user._id).select(
      "publishRequirements documents"
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

    const customerBudget = rest.inspectionBudget;
    const platformFee = Math.round(customerBudget * 0.3);

    const enquiryData = {
      ...rest,
      customer: req.user._id,
      inspectionTypes: {
        physical: inspectionTypes?.physical || false,
        chemical: inspectionTypes?.chemical || false,
      },
      platformFee,
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

    res.status(201).json({
      success: true,
      message: "Inspection enquiry raised successfully",
      enquiry: sanitizedEnquiry,
    });
  } catch (error) {
    next(errorHandler(500, "Failed to raise enquiry: " + error.message));
  }
};

const getMyEnquiries = async (req, res, next) => {
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

const getBidsForEnquiry = async (req, res, next) => {
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

    res.json({ success: true, bids, stats });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch bids: " + error.message));
  }
};

const confirmBid = async (req, res, next) => {
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

const cancelEnquiry = async (req, res, next) => {
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

module.exports = {
  raiseEnquiryController,
  getMyEnquiries,
  getBidsForEnquiry,
  confirmBid,
  cancelEnquiry,
  updateCustomerDocumentsController,
};
