const { transporter } = require("../../sendVerificationEmail");

module.exports = async function paymentUser(customer = {}, order = {}, payment = {}, opts = {}) {
  const currencySymbol = order.currency === "USD" ? "$" : "₹";
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const totalLabel = opts.amountLabel || (order.total ? (order.currency === "USD" ? `${currencySymbol}${order.total}` : `${currencySymbol}${order.total}`) : "—");
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
