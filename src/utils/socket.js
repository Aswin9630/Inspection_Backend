const socket = require("socket.io");
const { ChatRoom, Message } = require("../models/Chat/ChatModel");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
       origin: process.env.NODE_ENV === "development" ? process.env.FRONTEND_URL : process.env.FRONTEND_PROD_URL,
      methods: ["GET", "POST"],
    },
      path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials:true
  });

  io.on("connection", (socket) => {
    socket.on("joinChat", async ({ name, userId, targetId, orderId, role }) => {
      if (!userId || !targetId || !role || !orderId) {
        console.error("Missing required fields for chat room creation");
        return;
      }

      let room = await ChatRoom.findOne({ orderId });

      if (!room) {
        room = await ChatRoom.create({
          orderId,
          participants: [
            { role, refId: userId },
            {
              role: role === "customer" ? "inspector" : "customer",
              refId: targetId,
            },
          ],
          createdBy: { role, refId: userId },
        });
      }

      socket.join(orderId);

      socket.emit("progressUpdated", { level: room.progressLevel || 0 });
    });

    socket.on("progressUpdated", async ({ orderId, level }) => {
      await ChatRoom.findOneAndUpdate({ orderId }, { progressLevel: level });
      io.to(orderId).emit("progressUpdated", { level });
    });

    socket.on("sendMessage", async ({ name, userId, targetId, orderId, role, text, fileUrl, fileType, originalName }) => {
      const room = await ChatRoom.findOne({ orderId });
      if (!room) return;

      const message = await Message.create({
        room: room._id,
        sender: { role, refId: userId },
        text,
        fileUrl,
        fileType,
        originalName,
      });

      io.to(orderId).emit("messageReceived", {
        text: message.text,
        senderId: userId,
        role,
        sentAt: message.sentAt,
        fileUrl: message.fileUrl,
        fileType: message.fileType,
        originalName: message.originalName,
      });
    });

    socket.on("disconnect", () => {
    });
  });
};

module.exports = initializeSocket;
