const QuickServiceOrder = require("../../models/QuickService/QuickServiceOrder");

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await QuickServiceOrder.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (err) {
    console.error("getUserOrders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.user._id;
    const id = req.params.id;
    const order = await QuickServiceOrder.findOne({ _id: id, userId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.status(200).json(order);
  } catch (err) {
    console.error("getOrderById error:", err);
    return res.status(500).json({ error: "Failed to fetch order" });
  }
};

module.exports = { getUserOrders, getOrderById };
