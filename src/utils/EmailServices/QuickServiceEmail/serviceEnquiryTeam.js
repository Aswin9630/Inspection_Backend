const { htmlEscape } = require("../../sendVerificationEmail");

function html({ customerName, customerEmail, location, country, cartItemId, date, serviceSummary, adminEnquiryUrl }) {
  const adminLink = adminEnquiryUrl ? `<p style="margin-top:12px"><a href="${htmlEscape(adminEnquiryUrl)}" style="color:#0b63c6">Open enquiry in admin</a></p>` : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:20px">
    <h3 style="margin-bottom:8px">New location enquiry</h3>
    <p style="color:#444;margin:0 0 12px"><strong>${htmlEscape(location)}, ${htmlEscape(country)}</strong></p>
    <ul style="color:#333">
      <li><strong>Enquiry ID</strong>: ${htmlEscape(cartItemId)}</li>
      <li><strong>Customer</strong>: ${htmlEscape(customerName)} — ${htmlEscape(customerEmail)}</li>
      <li><strong>Date requested</strong>: ${htmlEscape(date)}</li>
      <li><strong>Details</strong>: ${htmlEscape(serviceSummary)}</li>
    </ul>
    ${adminLink}
  </div>
  `;
}

function text({ customerName, customerEmail, location, country, cartItemId, date, serviceSummary, adminEnquiryUrl }) {
  return `New location enquiry

Location: ${location}, ${country}
Enquiry ID: ${cartItemId}
Customer: ${customerName} — ${customerEmail}
Date requested: ${date}
Details: ${serviceSummary}
${adminEnquiryUrl ? `Open: ${adminEnquiryUrl}` : ""}

Qualty.ai`;
}

module.exports = { html, text };
