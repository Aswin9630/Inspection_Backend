const { htmlEscape } = require("../../sendVerificationEmail");

function html({ customerName, customerEmail, amount, orderId, paymentId, date, serviceSummary, adminOrderUrl }) {
  const adminLink = adminOrderUrl ? `<p style="margin-top:12px"><a href="${htmlEscape(adminOrderUrl)}" style="color:#0b63c6">Open order in admin</a></p>` : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:20px">
    <h3 style="margin-bottom:8px">New payment received</h3>
    <p style="color:#444;margin:0 0 12px">Order <strong>${htmlEscape(orderId)}</strong> — <strong>${htmlEscape(amount)}</strong></p>
    <ul style="color:#333">
      <li><strong>User</strong>: ${htmlEscape(customerName)} — ${htmlEscape(customerEmail)}</li>
      <li><strong>Payment ID</strong>: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px">${htmlEscape(paymentId)}</code></li>
      <li><strong>Items</strong>: ${htmlEscape(serviceSummary)}</li>
      <li><strong>Time</strong>: ${htmlEscape(date)}</li>
    </ul>
    ${adminLink}
  </div>
  `;
}

function text({ customerName, customerEmail, amount, orderId, paymentId, date, serviceSummary, adminOrderUrl }) {
  return `New payment received
Order: ${orderId}
Amount: ${amount}
User: ${customerName} — ${customerEmail}
Payment ID: ${paymentId}
Items: ${serviceSummary}
Time: ${date}
${adminOrderUrl ? `Open in admin: ${adminOrderUrl}` : ""}
Qualty.ai`;
}

module.exports = { html, text };
