const { transporter } = require("../sendVerificationEmail");

const sendCustomerPaymentConfirmation = async (customer, bid, payment) => {
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const text = `
Hi ${customer.name},

Your payment of ₹${payment.amount} has been successfully processed.

🧾 Order ID: ${payment.razorpayOrderId}
💳 Payment ID: ${payment.razorpayPaymentId}
👨‍🔬 Inspector Selected: ${bid.inspector.name}
📅 Time: ${formattedTime}

Your inspection is now confirmed. Our team will coordinate with the inspector and keep you updated.

Thank you for choosing Qualty.ai.
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: "Payment Confirmation - Inspection Bid",
    text,
  });
};

module.exports = sendCustomerPaymentConfirmation;
