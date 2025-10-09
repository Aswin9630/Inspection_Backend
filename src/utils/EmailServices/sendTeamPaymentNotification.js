const { transporter } = require("../sendVerificationEmail");

const sendTeamPaymentNotification = async (customer, bid, payment) => {
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const text = `
📢 New Payment Received

👤 Customer: ${customer.name}
📧 Email: ${customer.email}
📱 Mobile: ${customer.mobileNumber}

👨‍🔬 Inspector: ${bid.inspector.name}
📍 Location: ${bid.enquiry.inspectionLocation}, ${bid.enquiry.country}
📦 Commodity: ${bid.enquiry.commodityCategory} - ${bid.enquiry.subCommodity}
💰 Amount Paid: ₹${payment.amount}
🧾 Order ID: ${payment.razorpayOrderId}
💳 Payment ID: ${payment.razorpayPaymentId}
📅 Time: ${formattedTime}

Login to the admin dashboard to review and proceed.
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "Customer Payment Received - Inspection Bid",
    text,
  });
};

module.exports = sendTeamPaymentNotification;
