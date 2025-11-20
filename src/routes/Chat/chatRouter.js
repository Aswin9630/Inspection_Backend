const express = require("express");
const router = express.Router();
const createUploader = require("../../middleware/upload");
const { uploadMessageFile, getChatHistory, getProgressLevel, getProgressForOrders } = require("../../controllers/Chat/chatController");

const upload = createUploader("chat_media");

router.post("/upload/:orderId", upload.single("file"), uploadMessageFile);
router.get("/history/:orderId", getChatHistory);
router.get("/progress/:orderId", getProgressLevel);
router.post("/progress-multiple", getProgressForOrders);

module.exports = router;
