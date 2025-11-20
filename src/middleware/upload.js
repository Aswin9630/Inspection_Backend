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


// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../config/cloudinary"); // your configured cloudinary.v2 instance
// const path = require("path");

// const IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
// const RAW_MIMES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];

// function getResourceTypeForMimetype(mimetype) {
//   if (!mimetype) return "raw";
//   if (IMAGE_MIMES.includes(mimetype.toLowerCase())) return "image";
//   // treat common previewable types (pdf) as raw so cloudinary serves correct Content-Type
//   if (RAW_MIMES.includes(mimetype.toLowerCase())) return "raw";
//   // fallback
//   return "raw";
// }

// const createUploader = (folderName = "uploads") => {
//   const storage = new CloudinaryStorage({
//     cloudinary,
//     params: async (req, file) => {
//       const resource_type = getResourceTypeForMimetype(file.mimetype);
//       // Build a safe filename / public_id using timestamp + original name (without ext)
//       const ext = path.extname(file.originalname || "").replace(".", "");
//       const base = path.basename(file.originalname || "file", path.extname(file.originalname || ""));
//       const public_id = `${folderName}/${Date.now()}_${base}`;

//       return {
//         folder: folderName,
//         resource_type,
//         public_id,
//       };
//     },
//   });

//   return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
// };

// module.exports = createUploader;


// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../config/cloudinary");
// const path = require("path");

// const IMAGE_MIMES = [
//   "image/jpeg",
//   "image/jpg",
//   "image/png",
//   "image/webp",
//   "image/gif",
//   "image/svg+xml",
// ];

// const RAW_MIMES = [
//   "application/pdf",
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//   "application/zip",
//   "application/vnd.ms-excel",
//   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//   "video/mp4",
//   "video/quicktime",
//   "video/x-msvideo",
//   "video/webm",
// ];

// function getResourceTypeForMimetype(mimetype) {
//   if (!mimetype) return "raw";
//   const m = mimetype.toLowerCase();
//   if (IMAGE_MIMES.includes(m)) return "image";
//   return "raw";
// }

// const createUploader = (folderName = "uploads") => {
//   const storage = new CloudinaryStorage({
//     cloudinary,
//     params: async (req, file) => {
//       const resource_type = getResourceTypeForMimetype(file.mimetype);
//       const base = path.basename(file.originalname || "file", path.extname(file.originalname || ""));
//       const public_id = `${folderName}/${Date.now()}_${base}`;
//       return {
//         folder: folderName,
//         resource_type,
//         public_id,
//       };
//     },
//   });

//   return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
// };

// module.exports = createUploader;
 