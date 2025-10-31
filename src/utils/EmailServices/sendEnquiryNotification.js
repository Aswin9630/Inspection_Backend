const { transporter } = require("../sendVerificationEmail");

const sendEnquiryNotification = async (customer, enquiry) => {
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
  } = enquiry;

  const formattedFromDate = new Date(dateFrom).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const formattedToDate = new Date(dateTo).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const plainText = `
📢 New Inspection Enquiry Raised

👤 Customer: ${customer.name}
📧 Email: ${customer.email}
📱 Mobile: ${customer.mobileNumber}

📍 Location: ${location}, ${country}
📦 Commodity: ${category} - ${commodity}
📊 Volume: ${volume} units
⚡ Urgency Level: ${urgency}
💰 Budget: ₹${inspectionBudget}
📅 Inspection Window: ${formattedFromDate} to ${formattedToDate}
 
✅ Status: Draft
🕒 Raised At: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

Please log in to the admin dashboard to review and assign inspectors.
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "New Inspection Enquiry Raised",
    text: plainText,
  });
};

module.exports = sendEnquiryNotification;
