// const socketio = require("socket.io");
// const { ChatRoom, Message } = require("../models/Chat/ChatModel");

// const initializeSocket = (server, options = {}) => {
//   const io = socketio(server, {
//     cors: {
//       origin:
//         process.env.NODE_ENV === "development"
//           ? process.env.FRONTEND_URL
//           : process.env.FRONTEND_PROD_URL,
//       methods: ["GET", "POST"],
//     },
//     path: options.path || "/socket.io",
//     transports: ["websocket", "polling"],
//     withCredentials: true,
//   });

//   const userSocketMap = new Map();

//   io.on("connection", (socket) => {
//     const addUserSocket = (userId, socketId) => {
//       if (!userId) return;
//       const key = String(userId);
//       const set = userSocketMap.get(key) || new Set();
//       set.add(socketId);
//       userSocketMap.set(key, set);
//     };

//     const removeSocketFromMap = (socketId) => {
//       for (const [uid, set] of userSocketMap.entries()) {
//         if (set.has(socketId)) {
//           set.delete(socketId);
//           if (set.size === 0) userSocketMap.delete(uid);
//           else userSocketMap.set(uid, set);
//         }
//       }
//     };

//     socket.on("joinChat", async ({ name, userId, targetId, orderId, role }) => {
//       try {
//         if (!userId || !targetId || !role || !orderId) {
//           socket.emit("error", { message: "Missing required fields for joinChat" });
//           return;
//         }

//         addUserSocket(userId, socket.id);

//         let room = await ChatRoom.findOne({ orderId });
//         if (!room) {
//           room = await ChatRoom.create({
//             orderId,
//             participants: [
//               { role, refId: userId },
//               { role: role === "customer" ? "inspector" : "customer", refId: targetId },
//             ],
//             createdBy: { role, refId: userId },
//           });
//         }

//         socket.join(orderId);

//         socket.emit("progressState", {
//           progressLevel: room.progressLevel || 0,
//           stages: room.stages || [],
//         });
//       } catch (err) {
//         console.error("joinChat error:", err);
//         socket.emit("error", { message: "Internal error joining chat" });
//       }
//     });

//     socket.on("inspectorFinishStage", async ({ orderId, stageIndex, inspectorId }) => {
//       try {
//         if (!orderId || stageIndex === undefined) return;
//         const room = await ChatRoom.findOne({ orderId });
//         if (!room) {
//           io.to(socket.id).emit("error", { message: "Room not found" });
//           return;
//         }

//         const stage = room.stages.find((s) => s.stageIndex === stageIndex);
//         if (!stage) {
//           io.to(orderId).emit("error", { message: "Invalid stage" });
//           return;
//         }

//         stage.status = "pending_customer";
//         stage.inspectorFinishedAt = new Date();
//         await room.save();

//         io.to(orderId).emit("stagePendingCustomer", {
//           stageIndex,
//           stage,
//         });

//         const sysMsg = await Message.create({
//           room: room._id,
//           sender: { role: "system", refId: null },
//           text: `Stage ${stageIndex + 1} sent to customer for approval`,
//         });

//         io.to(orderId).emit("messageReceived", {
//           _id: sysMsg._id,
//           text: sysMsg.text,
//           senderId: null,
//           role: "system",
//           sentAt: sysMsg.sentAt,
//           messageType: "system",
//           audience: "inspector",
//         });
//       } catch (err) {
//         console.error("inspectorFinishStage error:", err);
//         io.to(socket.id).emit("error", { message: "Failed to finish stage" });
//       }
//     });

//     socket.on("customerAcceptStage", async ({ orderId, stageIndex, customerId }) => {
//       try {
//         if (!orderId || stageIndex === undefined) return;
//         const room = await ChatRoom.findOne({ orderId });
//         if (!room) {
//           io.to(socket.id).emit("error", { message: "Room not found" });
//           return;
//         }

//         const stage = room.stages.find((s) => s.stageIndex === stageIndex);
//         if (!stage) {
//           io.to(orderId).emit("error", { message: "Invalid stage" });
//           return;
//         }

//         if (stage.status !== "pending_customer") {
//           io.to(orderId).emit("error", { message: "Stage not pending customer approval" });
//           return;
//         }

//         stage.status = "completed";
//         stage.customerAcceptedAt = new Date();

//         if (room.progressLevel <= stageIndex) {
//           room.progressLevel = Math.min(stageIndex + 1, room.stages.length - 1);
//         }

//         await room.save();

//         io.to(orderId).emit("stageAccepted", {
//           stageIndex,
//           stage,
//           progressLevel: room.progressLevel,
//         });

//         const sysMsg = await Message.create({
//           room: room._id,
//           sender: { role: "system", refId: null },
//           text: `Customer accepted stage ${stageIndex + 1}`,
//         });

//         io.to(orderId).emit("messageReceived", {
//           _id: sysMsg._id,
//           text: sysMsg.text,
//           senderId: null,
//           role: "system",
//           sentAt: sysMsg.sentAt,
//           messageType: "system",
//           audience: "all",
//         });
//       } catch (err) {
//         console.error("customerAcceptStage error:", err);
//         io.to(socket.id).emit("error", { message: "Failed to accept stage" });
//       }
//     });

//     socket.on("customerRejectStage", async ({ orderId, stageIndex, reason, customerId }) => {
//       try {
//         if (!orderId || stageIndex === undefined) return;
//         const room = await ChatRoom.findOne({ orderId });
//         if (!room) {
//           io.to(socket.id).emit("error", { message: "Room not found" });
//           return;
//         }

//         const stage = room.stages.find((s) => s.stageIndex === stageIndex);
//         if (!stage) {
//           io.to(orderId).emit("error", { message: "Invalid stage" });
//           return;
//         }

//         if (stage.status !== "pending_customer") {
//           io.to(orderId).emit("error", { message: "Stage not pending customer approval" });
//           return;
//         }

//         stage.status = "in_progress";
//         stage.customerRejectedAt = new Date();
//         stage.rejectionReason = reason || "No reason provided";

//         if (room.progressLevel > stageIndex) {
//           room.progressLevel = stageIndex;
//         }

//         await room.save();

//         io.to(orderId).emit("stageRejected", {
//           stageIndex,
//           stage,
//         });

//         const sysMsg = await Message.create({
//           room: room._id,
//           sender: { role: "system", refId: null },
//           text: `Customer rejected stage ${stageIndex + 1}: ${stage.rejectionReason}`,
//         });

//         io.to(orderId).emit("messageReceived", {
//           _id: sysMsg._id,
//           text: sysMsg.text,
//           senderId: null,
//           role: "system",
//           sentAt: sysMsg.sentAt,
//           messageType: "system",
//           audience: "all",
//         });
//       } catch (err) {
//         console.error("customerRejectStage error:", err);
//         io.to(socket.id).emit("error", { message: "Failed to reject stage" });
//       }
//     });

//     socket.on("progressUpdated", async ({ orderId, level }) => {
//       try {
//         if (!orderId || level == null) return;
//         const room = await ChatRoom.findOneAndUpdate({ orderId }, { progressLevel: level }, { new: true });
//         io.to(orderId).emit("progressUpdated", { level: room.progressLevel });
//       } catch (err) {
//         console.error("progressUpdated error:", err);
//       }
//     });

//     // Sending message: persist then emit messageReceived (your existing logic)
//     socket.on("sendMessage", async ({ name, userId, targetId, orderId, role, text, fileUrl, fileType, originalName, tempId }) => {
//       try {
//         if (!orderId) return;
//         const room = await ChatRoom.findOne({ orderId });
//         if (!room) return;

//         const message = await Message.create({
//           room: room._id,
//           sender: { role, refId: userId },
//           text: text || "",
//           fileUrl,
//           fileType,
//           originalName,
//         });

//         const payload = {
//           _id: message._id,
//           text: message.text,
//           senderId: userId,
//           role,
//           sentAt: message.sentAt,
//           fileUrl: message.fileUrl,
//           fileType: message.fileType,
//           originalName: message.originalName,
//           tempId: tempId || null,
//         };

//         io.to(orderId).emit("messageReceived", payload);
//       } catch (err) {
//         console.error("sendMessage error:", err);
//         io.to(socket.id).emit("error", { message: "Failed to send message" });
//       }
//     });

//     socket.on("messagesViewed", async ({ orderId, viewerId, messageIds }) => {
//       try {
//         if (!Array.isArray(messageIds) || !viewerId) return;
//         const ids = messageIds.map((x) => String(x)).filter(Boolean);
//         if (ids.length === 0) return;

//         const messages = await Message.find({ _id: { $in: ids } }).select("_id sender").lean();
//         const seenAt = new Date().toISOString();

//         for (const m of messages) {
//           const senderRef = m.sender && m.sender.refId ? String(m.sender.refId) : null;
//           if (!senderRef) continue;

//           const payload = { messageId: String(m._id), byUserId: String(viewerId), seenAt };

//           const socketIdSet = userSocketMap.get(senderRef);
//           if (socketIdSet && socketIdSet.size > 0) {
//             for (const sid of socketIdSet) {
//               if (io.sockets.sockets.get(sid)) {
//                 io.to(sid).emit("messageSeen", payload);
//               }
//             }
//           } else {
//             io.to(orderId).emit("messageSeen", payload);
//           }

//         }

//         const foundIds = new Set(messages.map((x) => String(x._id)));
//         const missing = ids.filter((id) => !foundIds.has(id));
//         if (missing.length > 0) {
//           io.to(orderId).emit("messageSeen", { messageIds: missing, byUserId: String(viewerId), seenAt });
//         }
//       } catch (err) {
//         console.error("messagesViewed handler error:", err);
//       }
//     });

//     socket.on("disconnect", () => {
//       removeSocketFromMap(socket.id);
//     });
//   });

//   return io;
// };

// module.exports = initializeSocket;
 



// socket/initializeSocket.js
const socketio = require("socket.io");
const { ChatRoom, Message } = require("../models/Chat/ChatModel");

const initializeSocket = (server, options = {}) => {
  const io = socketio(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "development"
          ? process.env.FRONTEND_URL
          : process.env.FRONTEND_PROD_URL,
      methods: ["GET", "POST"],
    },
    path: options.path || "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
  });

  const userSocketMap = new Map();

  io.on("connection", (socket) => {
    const addUserSocket = (userId, socketId) => {
      if (!userId) return;
      const key = String(userId);
      const set = userSocketMap.get(key) || new Set();
      set.add(socketId);
      userSocketMap.set(key, set);
    };

    const removeSocketFromMap = (socketId) => {
      for (const [uid, set] of userSocketMap.entries()) {
        if (set.has(socketId)) {
          set.delete(socketId);
          if (set.size === 0) userSocketMap.delete(uid);
          else userSocketMap.set(uid, set);
        }
      }
    };

    /**
     * joinChat
     * payload: { name, userId, targetId, orderId, role, targetRole? }
     * - role: "customer" | "inspector" | "inspectionCompany"
     * - targetRole: optional explicit role for the other participant
     */
    socket.on("joinChat", async ({ name, userId, targetId, orderId, role, targetRole }) => {
      try {
        if (!userId || !targetId || !role || !orderId) {
          socket.emit("error", { message: "Missing required fields for joinChat" });
          return;
        }

        addUserSocket(userId, socket.id);

        let room = await ChatRoom.findOne({ orderId });
        if (!room) {
          // infer counterpart role if not provided
          let counterpartRole = targetRole;
          if (!counterpartRole) {
            if (role === "customer") counterpartRole = "inspectionCompany";
            else if (role === "inspectionCompany") counterpartRole = "customer";
            else counterpartRole = "customer";
          }

          room = await ChatRoom.create({
            orderId,
            participants: [
              { role, refId: userId },
              { role: counterpartRole, refId: targetId },
            ],
            createdBy: { role, refId: userId },
          });
        }

        socket.join(orderId);

        socket.emit("progressState", {
          progressLevel: room.progressLevel || 0,
          stages: room.stages || [],
        });
      } catch (err) {
        console.error("joinChat error:", err);
        socket.emit("error", { message: "Internal error joining chat" });
      }
    });

    // inspectorFinishStage, customerAcceptStage, customerRejectStage, progressUpdated
    // sendMessage, messagesViewed handlers remain unchanged and work with inspectionCompany role as well

    socket.on("inspectorFinishStage", async ({ orderId, stageIndex, inspectorId }) => {
      try {
        if (!orderId || stageIndex === undefined) return;
        const room = await ChatRoom.findOne({ orderId });
        if (!room) {
          io.to(socket.id).emit("error", { message: "Room not found" });
          return;
        }

        const stage = room.stages.find((s) => s.stageIndex === stageIndex);
        if (!stage) {
          io.to(orderId).emit("error", { message: "Invalid stage" });
          return;
        }

        stage.status = "pending_customer";
        stage.inspectorFinishedAt = new Date();
        await room.save();

        io.to(orderId).emit("stagePendingCustomer", {
          stageIndex,
          stage,
        });

        const sysMsg = await Message.create({
          room: room._id,
          sender: { role: "system", refId: null },
          text: `Stage ${stageIndex + 1} sent to customer for approval`,
        });

        io.to(orderId).emit("messageReceived", {
          _id: sysMsg._id,
          text: sysMsg.text,
          senderId: null,
          role: "system",
          sentAt: sysMsg.sentAt,
          messageType: "system",
          audience: "inspector",
        });
      } catch (err) {
        console.error("inspectorFinishStage error:", err);
        io.to(socket.id).emit("error", { message: "Failed to finish stage" });
      }
    });

    socket.on("customerAcceptStage", async ({ orderId, stageIndex, customerId }) => {
      try {
        if (!orderId || stageIndex === undefined) return;
        const room = await ChatRoom.findOne({ orderId });
        if (!room) {
          io.to(socket.id).emit("error", { message: "Room not found" });
          return;
        }

        const stage = room.stages.find((s) => s.stageIndex === stageIndex);
        if (!stage) {
          io.to(orderId).emit("error", { message: "Invalid stage" });
          return;
        }

        if (stage.status !== "pending_customer") {
          io.to(orderId).emit("error", { message: "Stage not pending customer approval" });
          return;
        }

        stage.status = "completed";
        stage.customerAcceptedAt = new Date();

        if (room.progressLevel <= stageIndex) {
          room.progressLevel = Math.min(stageIndex + 1, room.stages.length - 1);
        }

        await room.save();

        io.to(orderId).emit("stageAccepted", {
          stageIndex,
          stage,
          progressLevel: room.progressLevel,
        });

        const sysMsg = await Message.create({
          room: room._id,
          sender: { role: "system", refId: null },
          text: `Customer accepted stage ${stageIndex + 1}`,
        });

        io.to(orderId).emit("messageReceived", {
          _id: sysMsg._id,
          text: sysMsg.text,
          senderId: null,
          role: "system",
          sentAt: sysMsg.sentAt,
          messageType: "system",
          audience: "all",
        });
      } catch (err) {
        console.error("customerAcceptStage error:", err);
        io.to(socket.id).emit("error", { message: "Failed to accept stage" });
      }
    });

    socket.on("customerRejectStage", async ({ orderId, stageIndex, reason, customerId }) => {
      try {
        if (!orderId || stageIndex === undefined) return;
        const room = await ChatRoom.findOne({ orderId });
        if (!room) {
          io.to(socket.id).emit("error", { message: "Room not found" });
          return;
        }

        const stage = room.stages.find((s) => s.stageIndex === stageIndex);
        if (!stage) {
          io.to(orderId).emit("error", { message: "Invalid stage" });
          return;
        }

        if (stage.status !== "pending_customer") {
          io.to(orderId).emit("error", { message: "Stage not pending customer approval" });
          return;
        }

        stage.status = "in_progress";
        stage.customerRejectedAt = new Date();
        stage.rejectionReason = reason || "No reason provided";

        if (room.progressLevel > stageIndex) {
          room.progressLevel = stageIndex;
        }

        await room.save();

        io.to(orderId).emit("stageRejected", {
          stageIndex,
          stage,
        });

        const sysMsg = await Message.create({
          room: room._id,
          sender: { role: "system", refId: null },
          text: `Customer rejected stage ${stageIndex + 1}: ${stage.rejectionReason}`,
        });

        io.to(orderId).emit("messageReceived", {
          _id: sysMsg._id,
          text: sysMsg.text,
          senderId: null,
          role: "system",
          sentAt: sysMsg.sentAt,
          messageType: "system",
          audience: "all",
        });
      } catch (err) {
        console.error("customerRejectStage error:", err);
        io.to(socket.id).emit("error", { message: "Failed to reject stage" });
      }
    });

    socket.on("progressUpdated", async ({ orderId, level }) => {
      try {
        if (!orderId || level == null) return;
        const room = await ChatRoom.findOneAndUpdate({ orderId }, { progressLevel: level }, { new: true });
        io.to(orderId).emit("progressUpdated", { level: room.progressLevel });
      } catch (err) {
        console.error("progressUpdated error:", err);
      }
    });

    socket.on("sendMessage", async ({ name, userId, targetId, orderId, role, text, fileUrl, fileType, originalName, tempId }) => {
      try {
        if (!orderId) return;
        const room = await ChatRoom.findOne({ orderId });
        if (!room) return;

        const message = await Message.create({
          room: room._id,
          sender: { role, refId: userId },
          text: text || "",
          fileUrl,
          fileType,
          originalName,
        });

        const payload = {
          _id: message._id,
          text: message.text,
          senderId: userId,
          role,
          sentAt: message.sentAt,
          fileUrl: message.fileUrl,
          fileType: message.fileType,
          originalName: message.originalName,
          tempId: tempId || null,
        };

        io.to(orderId).emit("messageReceived", payload);
      } catch (err) {
        console.error("sendMessage error:", err);
        io.to(socket.id).emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("messagesViewed", async ({ orderId, viewerId, messageIds }) => {
      try {
        if (!Array.isArray(messageIds) || !viewerId) return;
        const ids = messageIds.map((x) => String(x)).filter(Boolean);
        if (ids.length === 0) return;

        const messages = await Message.find({ _id: { $in: ids } }).select("_id sender").lean();
        const seenAt = new Date().toISOString();

        for (const m of messages) {
          const senderRef = m.sender && m.sender.refId ? String(m.sender.refId) : null;
          if (!senderRef) continue;

          const payload = { messageId: String(m._id), byUserId: String(viewerId), seenAt };

          const socketIdSet = userSocketMap.get(senderRef);
          if (socketIdSet && socketIdSet.size > 0) {
            for (const sid of socketIdSet) {
              if (io.sockets.sockets.get(sid)) {
                io.to(sid).emit("messageSeen", payload);
              }
            }
          } else {
            io.to(orderId).emit("messageSeen", payload);
          }
        }

        const foundIds = new Set(messages.map((x) => String(x._id)));
        const missing = ids.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
          io.to(orderId).emit("messageSeen", { messageIds: missing, byUserId: String(viewerId), seenAt });
        }
      } catch (err) {
        console.error("messagesViewed handler error:", err);
      }
    });

    socket.on("disconnect", () => {
      removeSocketFromMap(socket.id);
    });
  });

  return io;
};

module.exports = initializeSocket;
