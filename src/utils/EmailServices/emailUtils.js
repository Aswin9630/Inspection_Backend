const fs = require("fs");
const path = require("path");
const { URL } = require("url");


function buildAttachments(attachmentUrl) {
  if (!attachmentUrl) return [];

  try {
    const isRemote = /^https?:\/\//i.test(attachmentUrl);
    if (isRemote) {
      const parsed = new URL(attachmentUrl);
      const filename = path.basename(parsed.pathname) || "attachment";
      return [{ filename, path: attachmentUrl }];
    }

    const localPath = path.isAbsolute(attachmentUrl)
      ? attachmentUrl
      : path.join(process.cwd(), attachmentUrl);

    if (fs.existsSync(localPath)) {
      return [{ filename: path.basename(localPath), path: localPath }];
    }

    console.warn("Attachment not found at path:", localPath);
    return [];
  } catch (err) {
    console.error("buildAttachments error:", err);
    return [];
  }
}


function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { buildAttachments, escapeHtml };
