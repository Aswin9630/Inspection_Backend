const { transporter } = require("../sendVerificationEmail");

const sendQuickServiceTeamNotification = async (customer, request, payment) => {
  const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const currencySymbol = payment.currency === "USD" ? "$" : "₹";

  const text = `
📢 New Quick Service Request Received

👤 Customer: ${customer.name}
📧 Email: ${customer.email}
📱 Mobile: ${customer.mobileNumber}

📍 Location: ${request.location}, ${request.state}
📦 Commodity: ${request.commodityCategory}
📅 Inspection Date: ${new Date(request.inspectionDate).toLocaleDateString("en-IN")}
🔍 Inspection Type: ${request.inspectionTypes}
🛠 Service: ${request.inspectionService}
📊 Volume: ${request.volume}
💰 Amount Paid: ${currencySymbol}${payment.amount}
🧾 Order ID: ${payment.razorpayOrderId}
💳 Payment ID: ${payment.razorpayPaymentId}
📅 Time: ${formattedDate}

Please review and assign an inspector.
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "New Quick Service Payment Received",
    text,
  });
};

module.exports = sendQuickServiceTeamNotification;
