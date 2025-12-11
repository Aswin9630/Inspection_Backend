const InspectionEnquiry = require("../../models/Customer/newCustomerEnquiryForm");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
const CompanyBid = require("../../models/InspectionCompany/companyBid");
const errorHandler = require("../../utils/errorHandler");
const Customer = require("../../models/Customer/customerModel");
const Payment = require("../../models/Payment/paymentModel");

const getAvailableEnquiriesForCompany = async (req, res, next) => {
  try {
    if (req.user.role !== "inspection_company") {
      return next(errorHandler(403, "Only inspection companies can view enquiries"));
    }

    const enquiries = await InspectionEnquiry.find({ status: "submitted" }).sort({ createdAt: -1 });

    const adjustedEnquiries = await Promise.all(
      enquiries.map(async (enquiry) => {
        if (enquiry.inspectionBudget < process.env.MINIMUM_BUDGET) {
          return next(errorHandler(400, "Please raise an enquiry with at least ₹1 budget."));
        }

        const bid = await CompanyBid.findOne({
          enquiry: enquiry._id,
          inspectionCompany: req.user._id
        });

        const platformFee = parseFloat((enquiry.inspectionBudget * 0.3).toFixed(2));
        const companyViewAmount = enquiry.inspectionBudget - platformFee;

        const { platformFee: _omit, ...sanitized } = enquiry.toObject();

        const customerDoc = await Customer.findById(enquiry.customer).select("name email mobileNumber");
        const contact = {
          name: customerDoc?.name || "",
          email: customerDoc?.email || "",
          phoneNumber: customerDoc?.mobileNumber || ""
        };

        return {
          ...sanitized,
          contact,
          inspectionBudget: companyViewAmount,
          hasPlacedBid: !!bid
        };
      })
    );

    res.json({ success: true, enquiries: adjustedEnquiries });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch enquiries: " + error.message));
  }
};

const placeCompanyBid = async (req, res, next) => {
  try {
    if (req.user.role !== "inspection_company") {
      return next(errorHandler(403, "Only inspection companies can bid"));
    }

    const company = await InspectionCompany.findById(req.user._id).select(
      "publishRequirements documents licenseNumber"
    );

    if (!company) {
      return next(errorHandler(404, "Inspection company not found"));
    }

    const pub = company.publishRequirements === true;
    const { incorporationCertificate } = company.documents || {};
    const licenseNumber = company.licenseNumber || null;

    const isMissing = (val) => !val || (typeof val === "string" && val.trim().length === 0);

    if (!pub || isMissing(incorporationCertificate) || isMissing(licenseNumber)) {
      return next(
        errorHandler(
          403,
          "You must enable 'Publish Requirements' and upload Incorporation Certificate and provide License Number before placing a bid"
        )
      );
    }

    const { enquiryId } = req.params;
    const { amount, note } = req.body;

    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || enquiry.status !== "submitted") {
      return next(errorHandler(404, "Enquiry not available for bidding"));
    }

    const existingBid = await CompanyBid.findOne({
      enquiry: enquiryId,
      inspectionCompany: req.user._id
    });

    if (existingBid) {
      return next(errorHandler(400, "You have already placed a bid for this enquiry"));
    }

    const platformFee = enquiry.platformFee;
    const customerViewAmount = amount + platformFee;

    const bid = await CompanyBid.create({
      enquiry: enquiryId,
      inspectionCompany: req.user._id,
      amount,
      note,
      customerViewAmount
    });

    const populatedBid = await CompanyBid.findById(bid._id).populate(
      "inspectionCompany",
      "companyName companyEmail phoneNumber mobileNumber certificates"
    );

    res.status(200).json({
      success: true,
      message: "Bid placed successfully",
      bid: {
        amount: populatedBid.amount,
        inspectionCompany: populatedBid.inspectionCompany,
        enquiry: enquiryId
      }
    });
  } catch (error) {
    next(errorHandler(500, "Failed to place bid: " + error.message));
  }
};

const cancelCompanyBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;

    const bid = await CompanyBid.findById(bidId);
    if (!bid || String(bid.inspectionCompany) !== String(req.user._id)) {
      return next(errorHandler(403, "Unauthorized or bid not found"));
    }

    bid.status = "withdrawn";
    await bid.save();

    res.json({ success: true, message: "Bid cancelled", bid });
  } catch (error) {
    next(errorHandler(500, "Failed to cancel bid: " + error.message));
  }
};

const getMyCompanyBids = async (req, res, next) => {
  try {
    const bids = await CompanyBid.find({ inspectionCompany: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, bids });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch bids: " + error.message));
  }
};

const getLowestCompanyBidsPerEnquiry = async (req, res, next) => {
  try {
    const lowestBids = await CompanyBid.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$enquiry",
          lowestBidAmount: { $min: "$amount" },
          bidCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "inspectionenquiries",
          localField: "_id",
          foreignField: "_id",
          as: "enquiryDetails"
        }
      },
      { $unwind: "$enquiryDetails" },
      {
        $project: {
          _id: 0,
          enquiryId: "$enquiryDetails._id",
          title: "$enquiryDetails.selectionSummary",
          location: "$enquiryDetails.inspectionLocation",
          country: "$enquiryDetails.country",
          lowestBidAmount: 1,
          bidCount: 1
        }
      },
      { $sort: { lowestBidAmount: 1 } }
    ]);

    res.json({ success: true, data: lowestBids });
  } catch (error) {
    next(errorHandler(500, "Failed to aggregate lowest bids: " + error.message));
  }
};

const updateCompanyDocumentsController = async (req, res, next) => {
  try {
    if (req.user.role !== "inspection_company") {
      return next(errorHandler(403, "Only inspection companies can update documents"));
    }

    const updates = {};

    if (req.files?.incorporationCertificate?.[0]?.path) {
      updates["documents.incorporationCertificate"] = req.files.incorporationCertificate[0].path;
    }

    const { licenseNumber, publishRequirements } = req.body;
    if (licenseNumber) updates["licenseNumber"] = String(licenseNumber).trim();

    if (typeof publishRequirements !== "undefined") {
      const pub =
        publishRequirements === true ||
        publishRequirements === "true" ||
        publishRequirements === 1 ||
        publishRequirements === "1";
      updates["publishRequirements"] = pub;
    }

    const current = await InspectionCompany.findById(req.user._id).lean();

    const hasIncorp =
      updates["documents.incorporationCertificate"] ||
      current?.documents?.incorporationCertificate;
    const hasLicense =
      updates["licenseNumber"] !== undefined
        ? updates["licenseNumber"]
        : current?.licenseNumber;
    const pub =
      updates["publishRequirements"] !== undefined
        ? updates["publishRequirements"]
        : current?.publishRequirements;

    const isComplete = pub && hasIncorp && hasLicense;

    const updatedCompany = await InspectionCompany.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select(
      "companyName companyEmail phoneNumber mobileNumber publishRequirements documents licenseNumber certificates"
    );

    res.status(200).json({
      success: true,
      message: "Documents updated successfully",
      company: updatedCompany
    });
  } catch (error) {
    next(errorHandler(500, "Failed to update documents: " + error.message));
  }
};

const getCompanyHistory = async (req, res, next) => {
  try {
    const companyId = req.user._id;
    const bids = await CompanyBid.find({ inspectionCompany: companyId })
      .populate("enquiry")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bids });
  } catch (err) {
    next(errorHandler(500, "Failed to fetch bid history"));
  }
};

const getCompanyWonBids = async (req, res, next) => {
  try {
    if (req.user.role !== "inspection_company") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const bids = await CompanyBid.find({ inspectionCompany: req.user._id, status: "won" })
      .populate({
        path: "enquiry",
        select: "location inspectionDate commodity volume contact status price platformFee createdAt"
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bids });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch won bids: " + error.message));
  }
};

const getCompanyAnalytics = async (req, res, next) => {
  try {
    const companyId = req.user._id;

    const company = await InspectionCompany.findById(companyId).select(
      "companyName companyEmail phoneNumber mobileNumber publishRequirements documents certificates createdAt"
    );

    if (!company) {
      return next(errorHandler(404, "Inspection company not found"));
    }

    const allBids = await CompanyBid.find({ inspectionCompany: companyId })
      .populate("enquiry")
      .sort({ createdAt: -1 });

      console.log("allBids",allBids)
    const wonBids = allBids.filter((bid) => bid.status === "won");
      console.log("wonBids",wonBids)
    const totalEarnings = wonBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);
      console.log("totalEarnings",totalEarnings)

    const totalBids = allBids.length;
    const winRate = totalBids > 0 ? ((wonBids.length / totalBids) * 100).toFixed(2) : "0.00";
    const recentBids = allBids.slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        profile: company,
        totalBids,
        wonBids: wonBids.length,
        totalEarnings,
        winRate,
        recentBids
      }
    });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch company analytics: " + error.message));
  }
};

const getConfirmedCustomersForCompany = async (req, res, next) => {
  try {
    const companyId = req.user._id;

    const wonBids = await CompanyBid.find({
      inspectionCompany: companyId,
      status: "won"
    }).populate({
      path: "enquiry",
      select: "customer commodity"
    });

    const validBids = wonBids.filter((bid) => bid.enquiry?.customer);

    const customers = [];
    for (const bid of validBids) {
      const enquiry = bid.enquiry;
      const customer = await Customer.findById(enquiry.customer).select(
        "name email mobileNumber"
      );
      const initialPayment = await Payment.findOne({
        enquiry: enquiry._id,
        phase: "initial",
        status: "paid"
      });

      if (customer) {
        customers.push({
          id: customer._id,
          name: customer.name,
          email: customer.email,
          mobileNumber: customer.mobileNumber,
          commodity: enquiry.commodity,
          orderId: initialPayment?.razorpayOrderId || "Not available"
        });
      }
    }

    res.status(200).json({ success: true, customers });
  } catch (error) {
    next({ status: 500, message: "Failed to fetch customers: " + error.message });
  }
};

module.exports = {
  getAvailableEnquiriesForCompany,
  placeCompanyBid,
  cancelCompanyBid,
  getMyCompanyBids,
  getLowestCompanyBidsPerEnquiry,
  updateCompanyDocumentsController,
  getCompanyHistory,
  getCompanyWonBids,
  getCompanyAnalytics,
  getConfirmedCustomersForCompany
};
