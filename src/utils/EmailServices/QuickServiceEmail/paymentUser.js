// const { htmlEscape } = require("../../sendVerificationEmail");

// function html({ customerName, amount, orderId, paymentId, date, serviceSummary, supportEmail }) {
//   return `
//   <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:20px">
//     <h2 style="margin:0 0 8px;font-weight:600">Payment received</h2>
//     <p style="margin:0 0 12px;color:#555">Hi <strong>${htmlEscape(customerName)}</strong>,</p>
//     <p style="margin:0 0 12px;color:#333">We’ve received your payment of <strong>${htmlEscape(amount)}</strong> for Quick Service.</p>
//     <table style="width:100%;border-collapse:collapse;margin:12px 0">
//       <tr><td style="color:#666;padding:6px 0">Order</td><td style="padding:6px 0"><strong>${htmlEscape(orderId)}</strong></td></tr>
//       <tr><td style="color:#666;padding:6px 0">Payment ID</td><td style="padding:6px 0"><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px">${htmlEscape(paymentId)}</code></td></tr>
//       <tr><td style="color:#666;padding:6px 0">Date</td><td style="padding:6px 0">${htmlEscape(date)}</td></tr>
//       <tr><td style="color:#666;padding:6px 0">Service</td><td style="padding:6px 0">${htmlEscape(serviceSummary)}</td></tr>
//     </table>
//     <p style="margin:0 0 12px;color:#333">Next steps: Our team will start processing your request and follow up if any details are needed.</p>
//     <p style="margin-top:16px;color:#777;font-size:13px">Questions? Reply to this email or contact <a href="mailto:${htmlEscape(supportEmail)}">${htmlEscape(supportEmail)}</a>.</p>
//     <p style="margin-top:16px;font-weight:600">Qualty.ai</p>
//   </div>
//   `;
// }

// function text({ customerName, amount, orderId, paymentId, date, serviceSummary, supportEmail }) {
//   return `Payment received

// Hi ${customerName}

// We’ve received your payment of ${amount} for Quick Service.

// Order: ${orderId}
// Payment ID: ${paymentId}
// Date: ${date}
// Service: ${serviceSummary}

// Next steps: Our team will start processing your request and follow up if any details are needed.

// Questions? Reply to this email or contact ${supportEmail}

// Qualty.ai`;
// }

// module.exports = { html, text };


const { transporter } = require("../../sendVerificationEmail");

module.exports = async function paymentUser(customer = {}, order = {}, payment = {}, opts = {}) {
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const totalLabel = opts.amountLabel || (order.total ? (order.currency === "USD" ? `$${order.total}` : `₹${order.total}`) : "—");
  const logoUrl = opts.logoUrl || "https://qualty.ai/assets/QualtyLogo-BQfT8ydk.png";

  const html = `
  <div style="font-family: Arial, sans-serif; color: #222; max-width:720px;margin:auto;background:#fff;padding:20px;border:1px solid #eee">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <img src="${logoUrl}" alt="Qualty.ai" style="height:40px;object-fit:contain" />
      <div style="text-align:right;font-size:12px;color:#666">${formattedTime}</div>
    </div>

    <h2 style="margin:8px 0 6px;font-size:18px;color:#111">Payment received</h2>
    <p style="margin:0 0 14px;color:#444;font-size:14px">Hi <strong>${customer?.name || customer?.email || "Customer"}</strong>,</p>

    <div style="padding:12px;border-radius:8px;background:#fafafa;border:1px solid #f0f0f0;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <div style="color:#666;font-size:13px">Order</div>
        <div style="font-weight:700">${order._id || "—"}</div>
      </div>
      <div style="display:flex;justify-content:space-between">
        <div style="color:#666;font-size:13px">Amount</div>
        <div style="font-weight:700">${totalLabel}</div>
      </div>
    </div>

    <div style="font-size:13px;color:#444">
      <div style="margin-bottom:6px"><strong>Payment ID:</strong> ${payment.razorpay_payment_id || payment._id || "—"}</div>
      <div style="margin-bottom:6px"><strong>Service:</strong> ${opts.serviceSummary || "Quick Service"}</div>
      ${opts.nextSteps ? `<div style="margin-top:10px;color:#555">${opts.nextSteps}</div>` : ""}
    </div>

    <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
    <div style="font-size:12px;color:#666">If you have questions, reply to this email or contact ${process.env.SUPPORT_EMAIL || "support@qualty.ai"}.</div>
    <div style="margin-top:12px;font-weight:700;color:#111">Qualty.ai</div>
  </div>
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer?.email,
    subject: `Payment received — Order ${order._id || ""}`,
    html,
  });
};
