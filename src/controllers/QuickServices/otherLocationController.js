const mongoose = require("mongoose");
const CartItem = require("../../models/QuickService/CartItem");
const QuickServiceRequestOtherLocation = require("../../models/QuickService/QuickServiceRequestOtherLocationModel");
const { sendEnquiryNotification } = require("../../utils/EmailServices/QuickServiceEmail/sender");

async function createOtherLocationRequest(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { items, notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const cleaned = items.map((it) => ({
      cartItemId: it?.cartItemId || it?._id || it?.id || null,
      serviceType: it?.serviceType || "",
      country: it?.country || "",
      location: it?.location || "",
      commodity: it?.commodity || "",
      volume: it?.volume ? Number(it.volume) : 0,
      unit: it?.unit || "",
      date: it?.date || "",
      raw: it || null,
      createdAt: new Date(),
    }));

    const requestDoc = new QuickServiceRequestOtherLocation({
      userId: user._id,
      items: cleaned,
      notes: notes || "",
      status: "pending",
      createdAt: new Date(),
    });

    await requestDoc.save();

    const cartItemIds = cleaned.map((c) => c.cartItemId).filter(Boolean);

    if (cartItemIds.length > 0) {
      const objectIds = cartItemIds
        .map((id) => {
          try {
            return mongoose.Types.ObjectId(String(id));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (objectIds.length > 0) {
        await CartItem.updateMany(
          { _id: { $in: objectIds }, userId: user._id, isEnquiry: true },
          { $set: { enquiryRaised: true } }
        );
      } else {
        await CartItem.updateMany(
          { _id: { $in: cartItemIds }, userId: user._id, isEnquiry: true },
          { $set: { enquiryRaised: true } }
        );
      }
    }

    const emailCartItem = {
      serviceType: cleaned.length === 1 ? cleaned[0].serviceType : cleaned.map((c) => c.serviceType).join("; "),
      location: cleaned.length === 1 ? cleaned[0].location : cleaned.map((c) => c.location).join("; "),
      country: cleaned.length === 1 ? cleaned[0].country : cleaned.map((c) => c.country).join("; "),
      commodity: cleaned.length === 1 ? cleaned[0].commodity : cleaned.map((c) => c.commodity).join("; "),
      volume: cleaned.length === 1 ? cleaned[0].volume : cleaned.map((c) => c.volume).join("; "),
      unit: cleaned.length === 1 ? cleaned[0].unit : cleaned.map((c) => c.unit).join("; "),
      items: cleaned,
    };

    try {
      await sendEnquiryNotification({
        user: { name: user.name, email: user.email, mobile: user.mobileNumber || user.phone || "" },
        cartItem: emailCartItem,
        note: notes || "",
        company: { name: "Qualty.ai", email: process.env.EMAIL_USER || "" },
      });

      requestDoc.emailSent = true;
      await requestDoc.save().catch(() => {});
      return res.status(201).json({ ok: true, requestId: requestDoc._id, emailSent: true });
    } catch (mailErr) {
      console.error("createOtherLocationRequest: sendEnquiryNotification failed", mailErr);
      requestDoc.emailSent = false;
      requestDoc.emailError = String(mailErr?.message || mailErr);
      await requestDoc.save().catch(() => {});
      // return success but indicate email failure
      return res.status(201).json({
        ok: true,
        requestId: requestDoc._id,
        emailSent: false,
        message: "Enquiry saved but email delivery failed; will retry or admin will follow up.",
      });
    }
  } catch (err) {
    console.error("createOtherLocationRequest error:", err);
    return res.status(500).json({ error: "Failed to create request" });
  }
}

module.exports = { createOtherLocationRequest };
