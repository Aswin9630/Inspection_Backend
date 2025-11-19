const QuickServiceLocation = require("../../models/QuickService/quickServiceModel");
const Payment = require("../../models/Payment/paymentModel");
const razorpay = require("../../config/razorpay");
const errorHandler= require("../../utils/errorHandler")
const InspectorsList = require("../../models/QuickService/quickServiceModel")
const QuickServiceRequest = require("../../models/QuickService/quickServicesModel")


const getLocationList = async (req, res, next) => {
  try {
    const locations = await QuickServiceLocation.find().select("state location price");
    res.json({ success: true, locations });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch location list"));
  }
};


const getGroupedLocationsByState = async (req, res, next) => {
  try {
    const inspectors = await QuickServiceLocation.find().select("state location price");

    const grouped = {};

    inspectors.forEach(({ state, location, price }) => {
      if (!grouped[state]) {
        grouped[state] = [];
      }

      const alreadyExists = grouped[state].some(entry => entry.location === location);
      if (!alreadyExists) {
        grouped[state].push({ location, price });
      }
    });

    res.json({ success: true, data: grouped });
  } catch (error) {
    next(errorHandler(500, "Failed to group location data"));
  }
};


const submitQuickServiceForm = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Unauthorized. Please login."));
    }

    const {
      location,
      commodityCategory,
      description,
      inspectionDate,
      inspectionTypes,
      inspectionService,
      contact,
      volume,
    } = req.body;

    const locationData = await InspectorsList.findOne({ location });
    if (!locationData) return next(errorHandler(404, "Location not found"));

    const price = locationData.price;
    const platformFee = Math.round(price * 0.3);

    const razorpayOrder = await razorpay.orders.create({
      amount: price * 100,
      currency: "INR",
      receipt: `quick_${Date.now()}`,
      payment_capture: 1,
    });

    const quickRequest = await QuickServiceRequest.create({
      customer: req.user._id,
      location: locationData.location,
      state: locationData.state,
      commodityCategory,
      description,
      inspectionDate: new Date(inspectionDate),
      inspectionTypes,
      inspectionService,
      contact,
      volume,
      price,
      platformFee,
      status: "draft",
      urgencyLevel: "High",
      razorpayOrderId: razorpayOrder.id,
    });

    const payment = await Payment.create({
      enquiry: quickRequest._id,
      customer: req.user._id,
      amount: price,
      currency: "INR",
      status: "pending",
      phase: "initial",
      razorpayOrderId: razorpayOrder.id,
    });

    quickRequest.paymentId = payment._id;
    await quickRequest.save();

    res.status(201).json({
      success: true,
      message: "Quick service request submitted",
      order: razorpayOrder,
      requestId: quickRequest._id,
      paymentId: payment._id,
       keyId: process.env.RAZORPAY_KEY_ID,
      customerDetails: {
        name: req.user.name,
        email: req.user.email,
        mobileNumber: req.user.mobileNumber,
      },
    });
  } catch (error) {
    console.error("Quick service error:", error);
    next(errorHandler(500, error.message));
  }
};

const getQuickServiceHistory = async (req, res, next) => {
  try {
    if (req.user.role !== "customer") {
      return next(errorHandler(403, "Unauthorized access"));
    }

    const requests = await QuickServiceRequest.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .select("location inspectionDate status price platformFee createdAt");

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch quick service history"));
  }
};


const getQuickServiceDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await QuickServiceRequest.findById(id).populate("paymentId");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Quick service request not found",
      });
    }

    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this request",
      });
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(errorHandler(500, "Failed to fetch request details: " + error.message));
  }
};



module.exports = {
  getLocationList,
  submitQuickServiceForm,
  getGroupedLocationsByState,
  getQuickServiceHistory,
  getQuickServiceDetails
};
