const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ParticipantSchema = new Schema({
  role: {
    type: String,
    enum: ["customer", "inspector", "admin"],
    required: true,
  },
  refId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
});

const StageSchema = new Schema({
  stageIndex: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "in_progress", "pending_customer", "completed", "rejected"],
    default: "pending",
  },
  inspectorStartedAt: Date,
  inspectorFinishedAt: Date,
  customerAcceptedAt: Date,
  customerRejectedAt: Date,
  rejectionReason: String,
});

const ChatRoomSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    participants: [ParticipantSchema],
    createdBy: ParticipantSchema,
    progressLevel: { type: Number, default: 0 },
      stages: {
      type: [StageSchema],
      default: [
        { stageIndex: 0, status: "pending" },
        { stageIndex: 1, status: "pending" },
        { stageIndex: 2, status: "pending" },
        { stageIndex: 3, status: "pending" },
      ],
    },
  },
  { timestamps: true }
);



const MessageSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    sender: ParticipantSchema,
    text: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
    },
    fileType: {
      type: String,
    },
    originalName: {
      type: String,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);


const ChatRoom = mongoose.model("ChatRoom", ChatRoomSchema);
const Message = mongoose.model("Message", MessageSchema);

module.exports = {
  ChatRoom,
  Message,
};
