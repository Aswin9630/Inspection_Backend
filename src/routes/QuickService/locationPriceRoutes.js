const express = require("express");
const router = express.Router();
const LocationPrice = require("../../models/QuickService/LocationPrice");

const { addLocationPrice } = require("../../controllers/QuickServices/locationPriceController");
const LocationPrice = require("../../models/QuickService/LocationPrice");

// router.post("/add", addLocationPrice);

router.post("/bulk-add", async (req, res) => {
  try {
    const entries = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "Payload must be an array of location entries" });
    }

    const sanitized = entries.map((entry) => ({
      country: entry.country?.trim(),
      state: entry.state?.trim(),
      region: entry.region?.trim(),
      currency: entry.currency?.toUpperCase(),
      price: Number(entry.price),
    }));

    await LocationPrice.insertMany(sanitized);
    res.status(201).json({ message: "Bulk location prices added", count: sanitized.length });
  } catch (err) {
    console.error("Bulk insert error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
