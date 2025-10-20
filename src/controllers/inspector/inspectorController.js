const InspectionEnquiry = require("../../models/Customer/customerEnquiryForm");
const Inspector = require("../../models/Inspector/inspectorModel");
const Bid = require("../../models/Inspector/bidModel");
const errorHandler = require("../../utils/errorHandler");
const Customer = require("../../models/Customer/customerModel");
const Payment = require("../../models/Payment/paymentModel");

const getAvailableEnquiries = async (req, res, next) => {
  try {
    if (req.user.role !== "inspector") {
      return next(errorHandler(403, "Only inspectors can view enquiries"));
    }

    const enquiries = await InspectionEnquiry.find({
      status: "draft",
    }).sort({ createdAt: -1 });

    const adjustedEnquiries = await Promise.all(
      enquiries.map(async (enquiry) => {
        if (enquiry.inspectionBudget < process.env.MINIMUM_BUDGET) {
          return next(
            errorHandler(
              400,
              "Please raise an enquiry with at least ₹1 budget."
            )
          );
        }
        const bid = await Bid.findOne({
          enquiry: enquiry._id,
          inspector: req.user._id,
        });
        const platformFee = parseFloat(
          (enquiry.inspectionBudget * 0.3).toFixed(2)
        );
        const inspectorViewAmount = enquiry.inspectionBudget - platformFee;
        const { platformFee: _, ...sanitized } = enquiry.toObject();

        return {
          ...sanitized,
          inspectionBudget: inspectorViewAmount,
          hasPlacedBid: !!bid,
        };
      })
    );

    res.json({ success: true, enquiries: adjustedEnquiries });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch enquiries: " + error.message));
  }
};
  
const placeBid = async (req, res, next) => {
  try {
    if (req.user.role !== "inspector") {
      return next(errorHandler(403, "Only inspectors can bid"));
    }

    const inspector = await Inspector.findById(req.user._id).select(
      "acceptsRequests identityDocuments billingDetails"
    );

    if (!inspector) {
      return next(errorHandler(404, "Inspector not found"));
    }

    if (inspector.acceptsRequests) {
      const { aadhaarCard } = inspector.identityDocuments || {};
      const { accountNumber, bankName, ifscCode } =
        inspector.billingDetails || {};

      const isMissing = (val) =>
        !val || typeof val !== "string" || val.trim().length === 0;

      if (
        isMissing(aadhaarCard) ||
        isMissing(accountNumber) ||
        isMissing(bankName) ||
        isMissing(ifscCode)
      ) {
        return next(
          errorHandler(
            403,
            "You must submit Aadhaar and complete banking details before placing a bid"
          )
        );
      }
    } else {
      return next(
        errorHandler(
          403,
          "You must submit Aadhaar and complete banking details before placing a bid"
        )
      );
    }

    const { enquiryId } = req.params;
    const { amount, note } = req.body;

    const enquiry = await InspectionEnquiry.findById(enquiryId);
    if (!enquiry || enquiry.status !== "draft") {
      return next(errorHandler(404, "Enquiry not available for bidding"));
    }

    const existingBid = await Bid.findOne({
      enquiry: enquiryId,
      inspector: req.user._id,
    });

    if (existingBid) {
      return next(
        errorHandler(400, "You have already placed a bid for this enquiry")
      );
    }

    const platformFee = enquiry.platformFee;
    const customerViewAmount = amount + platformFee;

    const bid = await Bid.create({
      enquiry: enquiryId,
      inspector: req.user._id,
      amount,
      note,
      customerViewAmount,
    });

    const populatedBid = await Bid.findById(bid._id).populate(
      "inspector",
      "name email mobileNumber commodities inspectorType"
    );

    res.status(200).json({
      success: true,
      message: "Bid placed successfully",
      bid: {
        amount: populatedBid.amount,
        inspector: populatedBid.inspector,
        enquiry: enquiryId, 
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to place bid: " + error.message));
  }
};

const cancelBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);
    if (!bid || String(bid.inspector) !== String(req.user._id)) {
      return next(errorHandler(403, "Unauthorized or bid not found"));
    }

    bid.status = "withdrawn";
    await bid.save();

    res.json({ success: true, message: "Bid cancelled", bid });
  } catch (error) {
    next(errorHandler(500, "Failed to cancel bid: " + error.message));
  }
};

const getMyBids = async (req, res, next) => {
  try {
    const bids = await Bid.find({ inspector: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, bids });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch bids: " + error.message));
  }
};

const getLowestBidsPerEnquiry = async (req, res, next) => {
  try {
    const lowestBids = await Bid.aggregate([
      {
        $match: { status: "active" },
      },
      {
        $group: {
          _id: "$enquiry",
          lowestBidAmount: { $min: "$amount" },
          bidCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "inspectionenquiries",
          localField: "_id",
          foreignField: "_id",
          as: "enquiryDetails",
        },
      },
      {
        $unwind: "$enquiryDetails",
      },
      {
        $project: {
          _id: 0,
          enquiryId: "$enquiryDetails._id",
          title: "$enquiryDetails.selectionSummary",
          location: "$enquiryDetails.inspectionLocation",
          country: "$enquiryDetails.country",
          lowestBidAmount: 1,
          bidCount: 1,
        },
      },
      {
        $sort: { lowestBidAmount: 1 },
      },
    ]);

    res.json({ success: true, data: lowestBids });
  } catch (error) {
    next(
      errorHandler(500, "Failed to aggregate lowest bids: " + error.message)
    );
  }
};

const updateInspectorDocumentsController = async (req, res, next) => {
  try {
    if (req.user.role !== "inspector") {
      return next(errorHandler(403, "Only inspectors can update documents"));
    }

    const updates = {};

    if (req.files?.aadhaarCard?.[0]?.path) {
      updates["identityDocuments.aadhaarCard"] = req.files.aadhaarCard[0].path;
    }

    const { accountNumber, bankName, ifscCode } = req.body;

    if (accountNumber) updates["billingDetails.accountNumber"] = accountNumber;
    if (bankName) updates["billingDetails.bankName"] = bankName;
    if (ifscCode) updates["billingDetails.ifscCode"] = ifscCode;

    // Fetch current inspector to check completeness
    const inspector = await Inspector.findById(req.user._id).lean();

    const hasAadhaar =
      updates["identityDocuments.aadhaarCard"] ||
      inspector?.identityDocuments?.aadhaarCard;
    const hasAccount =
      updates["billingDetails.accountNumber"] ||
      inspector?.billingDetails?.accountNumber;
    const hasBank =
      updates["billingDetails.bankName"] || inspector?.billingDetails?.bankName;
    const hasIFSC =
      updates["billingDetails.ifscCode"] || inspector?.billingDetails?.ifscCode;

    const isComplete = hasAadhaar && hasAccount && hasBank && hasIFSC;

    if (isComplete) {
      updates.acceptsRequests = true;
    }

    const updatedInspector = await Inspector.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("name email identityDocuments billingDetails acceptsRequests");

    res.status(200).json({
      success: true,
      message: "Documents updated successfully",
      inspector: updatedInspector,
    });
  } catch (error) {
    next(errorHandler(500, "Failed to update documents: " + error.message));
  }
};

const getInspectorHistory = async (req, res, next) => {
  try {
    const inspectorId = req.user._id;
    const bids = await Bid.find({ inspector: inspectorId })
      .populate("enquiry")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bids });
  } catch (err) {
    next(errorHandler(500, "Failed to fetch bid history"));
  }
};

const getWonBids = async (req, res, next) => {
  try {
    if (req.user.role !== "inspector") {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    const bids = await Bid.find({ inspector: req.user._id, status: "won" })
      .populate({
        path: "enquiry",
        select:
          "location inspectionDate commodity volume contact status price platformFee createdAt",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bids });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch won bids: " + error.message));
  }
};

const getInspectorAnalytics = async (req, res, next) => {
  try {
    const inspectorId = req.user._id;

    // 1. Inspector Profile
    const inspector = await Inspector.findById(inspectorId).select(
      "name email mobileNumber inspectorType commodities acceptsRequests identityDocuments billingDetails createdAt"
    );

    if (!inspector) {
      return next(errorHandler(404, "Inspector not found"));
    }

    // 2. All Bids
    const allBids = await Bid.find({ inspector: inspectorId })
      .populate("enquiry")
      .sort({ createdAt: -1 });

    // 3. Won Bids
    const wonBids = allBids.filter((bid) => bid.status === "won");

    // 4. Total Earnings (sum of won bid amounts)
    const totalEarnings = wonBids.reduce(
      (sum, bid) => sum + (bid.amount || 0),
      0
    );

    // 5. Total Bids Placed
    const totalBids = allBids.length;

    // 6. Win Rate
    const winRate =
      totalBids > 0 ? ((wonBids.length / totalBids) * 100).toFixed(2) : "0.00";

    // 7. Recent Activity (last 5 bids)
    const recentBids = allBids.slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        profile: inspector,
        totalBids,
        wonBids: wonBids.length,
        totalEarnings,
        winRate,
        recentBids,
      },
    });
  } catch (error) {
    next(
      errorHandler(500, "Failed to fetch inspector analytics: " + error.message)
    );
  }
};

const getConfirmedCustomersForInspector = async (req, res, next) => {
  try {
    const inspectorId = req.user._id;

    const wonBids = await Bid.find({ inspector: inspectorId, status: "won" })
      .populate({
        path: "enquiry",
        select: "customer commodityCategory",
      });

    const validBids = wonBids.filter((bid) => bid.enquiry?.customer);

    const customers = [];

    for (const bid of validBids) {
      const enquiry = bid.enquiry;
      const customer = await Customer.findById(enquiry.customer).select("name email mobileNumber");

      const initialPayment = await Payment.findOne({
        enquiry: enquiry._id,
        phase: "initial",
        status: "paid",
      });

      if (customer) {
        customers.push({
          id: customer._id,
          name: customer.name,
          email: customer.email,
          mobileNumber: customer.mobileNumber,
          commodity: enquiry.commodityCategory,
          orderId: initialPayment?.razorpayOrderId || "Not available",
        });
      }
    }

    res.status(200).json({ success: true, customers });
  } catch (error) {
    next({ status: 500, message: "Failed to fetch customers: " + error.message });
  }
};


module.exports = {
  getAvailableEnquiries,
  placeBid,
  cancelBid,
  getMyBids,
  getLowestBidsPerEnquiry,
  updateInspectorDocumentsController,
  getInspectorHistory,
  getWonBids,
  getInspectorAnalytics,
  getConfirmedCustomersForInspector
  
};
