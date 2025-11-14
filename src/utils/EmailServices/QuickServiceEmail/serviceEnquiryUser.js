const { htmlEscape } = require("../../sendVerificationEmail");

function html({ customerName, location, country, cartItemId, slaHours = 48, fallbackAmount = null, supportEmail }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:20px">
    <h2 style="margin:0 0 8px">Request received</h2>
    <p style="margin:0 0 12px">Hi <strong>${htmlEscape(customerName)}</strong>,</p>
    <p style="margin:0 0 12px">We received your request for <strong>${htmlEscape(location)}, ${htmlEscape(country)}</strong>. We don’t have a predefined price for this location yet.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0">
      <tr><td style="color:#666;padding:6px 0">Enquiry ID</td><td style="padding:6px 0"><strong>${htmlEscape(cartItemId)}</strong></td></tr>
      <tr><td style="color:#666;padding:6px 0">Status</td><td style="padding:6px 0">Enquiry raised</td></tr>
      <tr><td style="color:#666;padding:6px 0">Expected reply</td><td style="padding:6px 0">${htmlEscape(String(slaHours))} hours</td></tr>
    </table>
    ${fallbackAmount ? `<p style="margin-top:12px;color:#333">A provisional charge of <strong>${htmlEscape(fallbackAmount)}</strong> may be applied at checkout for Indian locations. Our team will confirm any changes.</p>` : ""}
    <p style="margin-top:16px;color:#777;font-size:13px">If you have questions, reply or contact <a href="mailto:${htmlEscape(supportEmail)}">${htmlEscape(supportEmail)}</a>.</p>
    <p style="margin-top:16px;font-weight:600">Qualty.ai</p>
  </div>
  `;
}

function text({ customerName, location, country, cartItemId, slaHours = 48, fallbackAmount = null, supportEmail }) {
  return `Request received

Hi ${customerName},

We received your request for ${location}, ${country}. We don’t have a predefined price for this location yet.

Enquiry ID: ${cartItemId}
Status: Enquiry raised
Expected reply: ${slaHours} hours

${fallbackAmount ? `A provisional charge of ${fallbackAmount} may be applied at checkout for Indian locations.` : ""}

If you have questions, reply or contact ${supportEmail}

Qualty.ai`;
}

module.exports = { html, text };
