const { transporter } = require("../sendVerificationEmail");

const sendQuickServiceCustomerConfirmation = async (customer, request, payment) => {
  const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const text = `
Hi ${customer.name},

Your quick service request has been successfully submitted and payment of ₹${payment.amount} has been received.

📍 Location: ${request.location}, ${request.state}
📦 Commodity: ${request.commodityCategory}
📅 Inspection Date: ${new Date(request.inspectionDate).toLocaleDateString("en-IN")}
📊 Volume: ${request.volume}
💰 Amount Paid: ₹${payment.amount}
🧾 Order ID: ${payment.razorpayOrderId}
💳 Payment ID: ${payment.razorpayPaymentId}
📅 Time: ${formattedDate}

Our team will coordinate with inspectors and follow up shortly.

Thank you for choosing Qualty.ai.
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: "Quick Service Request Confirmation",
    text,
  });
};

module.exports = sendQuickServiceCustomerConfirmation;
