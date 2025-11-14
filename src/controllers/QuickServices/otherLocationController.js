const QuickServiceRequestOtherLocation = require("../../models/QuickService/QuickServiceRequestOtherLocationModel");
const CartItem = require("../../models/QuickService/CartItem");

async function createOtherLocationRequest(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { items, notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const cleaned = items.map((it) => ({
      cartItemId: it.cartItemId || null,
      serviceType: it.serviceType || "UNKNOWN",
      country: it.country || "",
      location: it.location || "",
      commodity: it.commodity || "",
      volume: it.volume ? Number(it.volume) : 0,
      unit: it.unit || "",
      date: it.date || "",
      raw: it,
    }));

    const doc = new QuickServiceRequestOtherLocation({
      userId: user._id,
      items: cleaned,
      notes: notes || "",
      status: "pending",
    });

    await doc.save();

    const cartItemIds = cleaned.map((i) => i.cartItemId).filter(Boolean);
    if (cartItemIds.length) {
      await CartItem.updateMany(
        { _id: { $in: cartItemIds }, userId: user._id, isEnquiry: true },
        { $set: { enquiryRaised: true } }
      );
    }

    return res.status(201).json({ ok: true, requestId: doc._id });
  } catch (err) {
    console.error("createOtherLocationRequest error:", err);
    return res.status(500).json({ error: "Failed to create request" });
  }
}

module.exports = { createOtherLocationRequest };
