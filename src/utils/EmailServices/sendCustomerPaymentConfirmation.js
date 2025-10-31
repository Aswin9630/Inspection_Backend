const { transporter } = require("../sendVerificationEmail");

const sendCustomerPaymentConfirmation = async (customer, bid, payment) => {
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const totalAmount = bid.customerViewAmount || 0;
  const paidAmount = payment.amount;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #000; background: #fff; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd;">
      <h2 style="border-bottom: 1px solid #000; padding-bottom: 10px;">Qualty.ai Payment Confirmation</h2>

      <p><strong>Customer Name:</strong> ${customer.name}</p>
      <p><strong>Email:</strong> ${customer.email}</p>
      <p><strong>Phone:</strong> ${customer.mobileNumber}</p>
      <p><strong>Inspector Confirmed:</strong> ${bid.inspector.name}</p>
      <p><strong>Enquiry ID:</strong> ${bid.enquiry._id}</p>
      <p><strong>Location:</strong> ${bid.enquiry.location}, ${bid.enquiry.country}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #000; color: #fff;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ccc;">Paid (Initial 30%)</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ccc;">${paidAmount}</td>
          </tr>
          <tr>
            <td style="padding: 10px;">Remaining (Final 70%)</td>
            <td style="padding: 10px; text-align: right;">${remainingAmount}</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 30px;">🧾 <strong>Order ID:</strong> ${payment.razorpayOrderId}</p>
      <p>💳 <strong>Payment ID:</strong> ${payment.razorpayPaymentId}</p>

      <p style="margin-top: 30px;">Your inspection is now confirmed. Our team will coordinate with the inspector and keep you updated.</p>

      <hr style="margin-top: 40px;" />
      <p style="font-size: 12px; color: #555;">
        Qualty.ai | support@qualty.ai<br />
        GSTIN: 29AAMCP9070G1ZV | CIN: U51909KA2022PTC161277
      </p>
    </div>
  `;

  const text = `
Qualty.ai Payment Confirmation

Customer Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.mobileNumber}
Inspector Selected: ${bid.inspector.name}
Enquiry ID: ${bid.enquiry._id}
Location: ${bid.enquiry.inspectionLocation}, ${bid.enquiry.country}
Time: ${formattedTime}

Paid (Initial 30%): ₹${paidAmount}
Remaining (Final 70%): ₹${remainingAmount}

Order ID: ${payment.razorpayOrderId}
Payment ID: ${payment.razorpayPaymentId}

Your inspection is now confirmed. Our team will coordinate with the inspector and keep you updated.

Qualty.ai | support@qualty.ai
GSTIN: 29AAMCP9070G1ZV | CIN: U51909KA2022PTC161277
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: "Payment Confirmation - Inspection Bid",
    text,
    html,
  });
};

module.exports = sendCustomerPaymentConfirmation;
