const LocationPrice = require("../../models/QuickService/LocationPrice");

exports.addLocationPrice = async (req, res) => {
  try {
    const { country, state, region, currency, price } = req.body;

    if (!country || !region || !currency || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const validCurrency = currency.toUpperCase();
    if (!["INR", "USD"].includes(validCurrency)) {
      return res.status(400).json({ error: "Currency must be INR or USD" });
    }

    const entry = new LocationPrice({
      country: country.trim(),
      state: state?.trim(),
      region: region.trim(),
      currency: validCurrency,
      price: Number(price),
    });

    await entry.save();
    res.status(201).json({ message: "Location price added", entry });
  } catch (err) {
    console.error("Error adding location price:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
