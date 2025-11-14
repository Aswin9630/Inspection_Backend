
function formatCurrency(amount, currency = "INR") {
  if (typeof amount !== "number") amount = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
}

function headerHtml(title) {
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:18px;">
      <div style="max-width:720px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e6e9ee;">
        <div style="background:#0b1220;color:#fff;padding:18px 24px;">
          <h2 style="margin:0;font-weight:600">${title}</h2>
        </div>
        <div style="background:#fff;padding:20px 24px;color:#111;">
  `;
}

function footerHtml() {
  return `
        <div style="padding:18px 24px;background:#f7f9fc;color:#6b7280;font-size:13px;">
          <div>© ${new Date().getFullYear()} Qualty.ai Ltd.</div>
          <div style="margin-top:6px">This email contains transactional information about your Qualty.ai request.</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Payment notification HTML (customer/team)
 * payload: { user, order, payment, items, totals, companyInfo }
 */
function paymentHtml(payload) {
  const { user, order, payment, items = [], totals = {}, company = {} } = payload;
  const currency = payment?.currency || totals?.currency || "INR";
  const amt = typeof payment?.amount === "number" ? payment.amount / 100 : (payment?.amount || 0);

  const itemsHtml = items.length
    ? items
        .map(
          (it, idx) =>
            `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #eef2f6;">${idx + 1}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eef2f6;">${it.description || it.serviceType || "-"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eef2f6;text-align:center;">${it.quantity || it.volume || 1} ${it.unit || ""}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eef2f6;text-align:right;">${formatCurrency(Number(it.unitPriceMajor || it.price || 0), currency)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eef2f6;text-align:right;">${formatCurrency(Number(it.totalMajor || (it.unitPriceMajor || it.price || 0) * (it.quantity || it.volume || 1)), currency)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="5" style="padding:12px;color:#6b7280;">No line items available</td></tr>`;

  const subtotalHtml = `<tr><td colspan="4" style="padding:8px 12px;text-align:right;border-top:1px solid #eef2f6;">Subtotal</td><td style="padding:8px 12px;text-align:right;border-top:1px solid #eef2f6;">${formatCurrency(totals.subtotal || order?.subtotal || 0, currency)}</td></tr>`;
  const taxHtml = `<tr><td colspan="4" style="padding:8px 12px;text-align:right;">Tax</td><td style="padding:8px 12px;text-align:right;">${formatCurrency(totals.tax || order?.tax || 0, currency)}</td></tr>`;
  const totalHtml = `<tr><td colspan="4" style="padding:8px 12px;text-align:right;font-weight:600;">Total</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${formatCurrency(totals.total || order?.total || (amt), currency)}</td></tr>`;

  return (
    headerHtml("Qualty.ai — Payment Confirmation") +
    `
      <p style="margin:0 0 12px 0;color:#374151;">Hello ${user?.name || user?.email || "Customer"},</p>

      <p style="margin:0 0 10px 0;color:#374151;">
        We have received a payment for your quick service request. Below are the transaction and request details.
      </p>

      <h4 style="margin-top:18px;margin-bottom:8px;">Payment summary</h4>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#111;margin-bottom:12px;">
        <tr>
          <td style="padding:6px 0;width:150px;color:#6b7280;">Payment ID</td>
          <td style="padding:6px 0;">${payment?.razorpay_payment_id || payment?.razorpayPaymentId || "-"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Order ID</td>
          <td style="padding:6px 0;">${payment?.razorpay_order_id || payment?.razorpayOrderId || "-"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Status</td>
          <td style="padding:6px 0;">${payment?.status || "-"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Amount</td>
          <td style="padding:6px 0;">${formatCurrency(amt, currency)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Captured At</td>
          <td style="padding:6px 0;">${new Date(payment?.createdAt || Date.now()).toLocaleString("en-IN")}</td>
        </tr>
      </table>

      <h4 style="margin-top:12px;margin-bottom:8px;">Request details</h4>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#111;margin-bottom:18px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Customer</td><td style="padding:6px 0;">${user?.name || user?.email}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${user?.email || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Location</td><td style="padding:6px 0;">${order?.items?.[0]?.location || order?.country || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Commodity</td><td style="padding:6px 0;">${(order?.items?.[0]?.commodity) || (items?.[0]?.description) || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Inspection Date</td><td style="padding:6px 0;">${order?.items?.[0]?.date || "-"}</td></tr>
      </table>

      <h4 style="margin-top:6px;margin-bottom:8px;">Items</h4>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#111;margin-bottom:18px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #eef2f6;">#</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #eef2f6;">Description</th>
            <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #eef2f6;">Qty</th>
            <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef2f6;">Unit price</th>
            <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef2f6;">Line total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${subtotalHtml}
          ${taxHtml}
          ${totalHtml}
        </tbody>
      </table>

      <p style="color:#374151;margin-top:6px;">If you have any questions, reply to this email or contact our support team.</p>

      <hr style="border:none;border-top:1px solid #eef2f6;margin:18px 0;" />
      <div style="color:#6b7280;font-size:13px;">
        <strong>Company:</strong> ${company?.name || "Qualty.ai"} · ${company?.email || process.env.EMAIL_USER || ""} · ${company?.phone || ""}
      </div>
    ` +
    footerHtml()
  );
}

/**
 * Enquiry notification HTML (customer/team)
 * payload: { user, cartItem, companyInfo, note }
 */
function enquiryHtml(payload) {
  const { user, cartItem = {}, company = {}, note = "" } = payload;

  return (
    headerHtml("Qualty.ai — Enquiry Received") +
    `
      <p style="margin:0 0 12px 0;color:#374151;">Hello ${user?.name || user?.email || "Customer"},</p>

      <p style="margin:0 0 12px 0;color:#374151;">
        Thank you. We have received your enquiry for a service at a location currently not supported. Our team will review and follow up shortly.
      </p>

      <h4 style="margin-top:12px;margin-bottom:8px;">Enquiry details</h4>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#111;margin-bottom:12px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Customer</td><td style="padding:6px 0;">${user?.name || user?.email}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${user?.email || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Service Type</td><td style="padding:6px 0;">${cartItem.serviceType || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Country / Location</td><td style="padding:6px 0;">${cartItem.country || "-"} / ${cartItem.location || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Commodity</td><td style="padding:6px 0;">${cartItem.commodity || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Volume</td><td style="padding:6px 0;">${cartItem.volume || "-"} ${cartItem.unit || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Requested Date</td><td style="padding:6px 0;">${cartItem.date || "-"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Enquiry raised</td><td style="padding:6px 0;">${cartItem.enquiryRaised ? "Yes" : "No"}</td></tr>
      </table>

      ${note ? `<p style="color:#374151">${note}</p>` : ""}

      <hr style="border:none;border-top:1px solid #eef2f6;margin:18px 0;" />
      <div style="color:#6b7280;font-size:13px;">
        <strong>Company:</strong> ${company?.name || "Qualty.ai"} · ${company?.email || process.env.EMAIL_USER || ""} · ${company?.phone || ""}
      </div>
    ` +
    footerHtml()
  );
}

module.exports = { paymentHtml, enquiryHtml, formatCurrency };
