const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const createUploader = (folderName) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folderName,
      allowed_formats: ["jpg", "png", "pdf", "docx", "mp4", "mov", "avi", "webm",, "xlsx", "zip"],
      resource_type: "auto",
    },
  });

  return multer({ storage });
};

module.exports = createUploader;
