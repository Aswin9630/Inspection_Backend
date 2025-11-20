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

//   io.on("connection", (socket) => {
//     // Join chat room
//     socket.on("joinChat", async ({ name, userId, targetId, orderId, role }) => {
//       try {
//         if (!userId || !targetId || !role || !orderId) {
//           socket.emit("error", { message: "Missing required fields for joinChat" });
//           return;
//         }

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

//         // Emit current progress and stages
//         socket.emit("progressState", {
//           progressLevel: room.progressLevel || 0,
//           stages: room.stages || [],
//         });
//       } catch (err) {
//         console.error("joinChat error:", err);
//         socket.emit("error", { message: "Internal error joining chat" });
//       }
//     });

//     // Inspector finishes a stage -> pending_customer
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

//         // Notify both clients about new status (UI)
//         io.to(orderId).emit("stagePendingCustomer", {
//           stageIndex,
//           stage,
//         });

//         // Persisted system message targeted to inspector only (audience: inspector)
//         const sysMsg = await Message.create({
//           room: room._id,
//           sender: { role: "system", refId: null },
//           text: `Stage ${stageIndex + 1} sent to customer for approval`,
//           // optional: not required to store audience, but include in emitted payload below
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

//     // Customer accepts stage
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

//         // Persisted system message visible to all participants (audience: all)
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

//     // Customer rejects stage -> in_progress, notify all
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

//     // Generic progress update (admin override)
//     socket.on("progressUpdated", async ({ orderId, level }) => {
//       try {
//         if (!orderId || level == null) return;
//         const room = await ChatRoom.findOneAndUpdate({ orderId }, { progressLevel: level }, { new: true });
//         io.to(orderId).emit("progressUpdated", { level: room.progressLevel });
//       } catch (err) {
//         console.error("progressUpdated error:", err);
//       }
//     });

//     // Persisted message handler: includes tempId echo for reconciliation
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

//     socket.on("disconnect", () => {
//     });
//   });

//   return io;
// };

// module.exports = initializeSocket;


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

  io.on("connection", (socket) => {
    socket.on("joinChat", async ({ name, userId, targetId, orderId, role }) => {
      try {
        if (!userId || !targetId || !role || !orderId) {
          socket.emit("error", { message: "Missing required fields for joinChat" });
          return;
        }

        let room = await ChatRoom.findOne({ orderId });
        if (!room) {
          room = await ChatRoom.create({
            orderId,
            participants: [
              { role, refId: userId },
              { role: role === "customer" ? "inspector" : "customer", refId: targetId },
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

    socket.on("disconnect", () => {});
  });

  return io;
};

module.exports = initializeSocket;
