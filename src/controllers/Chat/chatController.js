const { ChatRoom, Message } = require("../../models/Chat/ChatModel");

const uploadMessageFile = async (req, res) => {
  try {
    const { role, refId } = req.body;
    const { orderId } = req.params;
    const file = req.file;

    const room = await ChatRoom.findOne({ orderId });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    const message = await Message.create({
      room: room._id,
      sender: { role, refId },
      fileUrl: file.path,
      fileType: file.mimetype,
      originalName: file.originalname, 
    });

    res.status(200).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const room = await ChatRoom.findOne({ orderId });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    const messages = await Message.find({ room: room._id }).sort({ sentAt: 1 });
    res.status(200).json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 

const getProgressLevel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const room = await ChatRoom.findOne({ orderId });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    res.status(200).json({ success: true, level: room.progressLevel || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProgressForOrders = async (req, res) => {
  try {
    const { orderIds } = req.body; 
    const rooms = await ChatRoom.find({ orderId: { $in: orderIds } });

    const progressMap = {};
    rooms.forEach(room => {
      progressMap[room.orderId] = room.progressLevel || 0;
    });

    res.status(200).json({ success: true, progressMap });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {getChatHistory,uploadMessageFile,getProgressLevel,getProgressForOrders}   

