// const { transporter } = require("../sendVerificationEmail");
// const { buildAttachments, escapeHtml } = require("./emailUtils");

// const sendEnquiryNotification = async (customer, enquiry) => {
//   const {
//     location,
//     country,
//     urgency,
//     category,
//     subcategory,
//     commodity,
//     volume,
//     inspectionBudget,
//     dateFrom,
//     dateTo,
//     currency,
//      otherRequirements,
//       attachmentUrl,
//   } = enquiry;

//   const formattedFromDate = new Date(dateFrom).toLocaleDateString("en-IN", {
//     day: "numeric", month: "long", year: "numeric"
//   });

//   const formattedToDate = new Date(dateTo).toLocaleDateString("en-IN", {
//     day: "numeric", month: "long", year: "numeric"
//   });

//   const currencySymbol = currency === "USD" ? "$" : "₹";

//   const plainText = `
// 📢 New Inspection Enquiry Raised

// 👤 Customer: ${customer.name}
// 📧 Email: ${customer.email}
// 📱 Mobile: ${customer.mobileNumber}

// 📍 Location: ${location}, ${country}
// 📦 Commodity: ${category} - ${commodity}
// 📊 Volume: ${volume} units
// ⚡ Urgency Level: ${urgency}
// 💰 Budget: ${currencySymbol}${inspectionBudget}
// 📅 Inspection Date: ${formattedFromDate} to ${formattedToDate}
 
// ✅ Status: Draft
// 🕒 Raised At: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

// Please log in to the admin dashboard to review and assign inspectors.
//   `;

//   await transporter.sendMail({
//     from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
//     to: process.env.EMAIL_USER,
//     subject: "New Inspection Enquiry Raised",
//     text: plainText,
//   });
// };

// module.exports = sendEnquiryNotification;



// sendEnquiryNotification.js
const { transporter } = require("../sendVerificationEmail");
const { buildAttachments, escapeHtml } = require("./emailUtils");

const sendEnquiryNotification = async (customer, enquiry) => {
  try {
    const {
      location,
      country,
      urgency,
      category,
      subcategory,
      commodity,
      volume,
      inspectionBudget,
      dateFrom,
      dateTo,
      currency,
      otherRequirements,
      attachmentUrl,
    } = enquiry;

    const formattedFromDate = dateFrom
      ? new Date(dateFrom).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : "N/A";

    const formattedToDate = dateTo
      ? new Date(dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : "N/A";

    const currencySymbol = currency === "USD" ? "$" : "₹";

    let plainText = [
      "📢 New Inspection Enquiry Raised",
      "",
      `Customer: ${customer.name || "Unknown"}`,
      `Email: ${customer.email || "Unknown"}`,
      `Mobile: ${customer.mobileNumber || "Unknown"}`,
      "",
      `Location: ${location || "N/A"}, ${country || "N/A"}`,
      `Commodity: ${category || "N/A"}${commodity ? " - " + commodity : ""}`,
      `Subcategory: ${subcategory || "N/A"}`,
      `Volume: ${volume || "N/A"} units`,
      `Urgency Level: ${urgency || "N/A"}`,
      `Budget: ${currencySymbol}${inspectionBudget || 0}`,
      `Inspection Window: ${formattedFromDate} → ${formattedToDate}`,
      "",
    ].join("\n");

    if (otherRequirements && String(otherRequirements).trim().length > 0) {
      plainText += `\nAdditional Requirements:\n${String(otherRequirements).trim()}\n`;
    }

    plainText += `\nRaised At: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;

    const attachments = buildAttachments(attachmentUrl);

    await transporter.sendMail({
      from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Enquiry: ${category || "Enquiry"} — ${customer.name || "Customer"}`,
      text: plainText,
      attachments,
    });
  } catch (err) {
    console.error("sendEnquiryNotification error:", err);
  }
};

module.exports = sendEnquiryNotification;
