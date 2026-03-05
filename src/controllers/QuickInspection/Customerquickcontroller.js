const InspectionRequest = require("../../models/QuickInspection/InspectionRequest");

exports.getCustomerRequestsController = async (req, res) => {
  try {
    const requests = await InspectionRequest.find({ customer: req.user._id })
      .populate("company", "companyName companyEmail")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};