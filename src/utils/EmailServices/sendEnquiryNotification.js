const { transporter } = require("../sendVerificationEmail"); 

const sendEnquiryNotification = async (customer, enquiry) => {
  const {
    inspectionLocation,
    country,
    urgencyLevel,
    commodityCategory,
    subCommodity,
    volume,
    inspectionBudget,
    inspectionDate,
  } = enquiry;

  const formattedFromDate = new Date(inspectionDate.from).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const formattedToDate = new Date(inspectionDate.to).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const plainText = `
📢 New Inspection Enquiry Raised

👤 Customer: ${customer.name}
📧 Email: ${customer.email}
📱 Mobile: ${customer.mobileNumber}

📍 Location: ${inspectionLocation}, ${country}
📦 Commodity: ${commodityCategory} - ${subCommodity}
📊 Volume: ${volume} units
⚡ Urgency Level: ${urgencyLevel}
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
