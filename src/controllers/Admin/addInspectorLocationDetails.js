const InspectorsList = require("../../models/QuickService/quickServiceModel");

const InsertInspectorsLocations = async (req, res, next) => {
  try {
    const { state, inspectors } = req.body;

    if (!state || !Array.isArray(inspectors)) {
      return next(errorHandler(400, "State and inspectors array are required"));
    }

    const formattedData = inspectors.map((entry) => ({
      state,
      location: entry.location,
      contactNumber: entry.contactNumber,
      inspectorName: entry.name,
      price: entry.rate,
    }));

    await InspectorsList.insertMany(formattedData);

    res.status(201).json({ success: true, message: `${formattedData.length} entries added for ${state}` });
  } catch (error) {
    next(errorHandler(500, "Failed to insert location data: " + error.message));
  }
};


module.exports = {InsertInspectorsLocations}