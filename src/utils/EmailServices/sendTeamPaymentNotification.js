const { transporter } = require("../sendVerificationEmail");

const sendTeamPaymentNotification = async (customer, bid, payment, opts = {}) => {
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const totalAmount = (bid && bid.customerViewAmount) || (payment.enquiry && payment.enquiry.inspectionBudget) || 0;
  const paidAmount = payment.amount || 0;
  const totalPaid = opts.totalPaid ?? paidAmount;
  const remainingAmount = Math.max(0, totalAmount - totalPaid);
  const phaseLabel = payment.phase === "final" ? "Final (70%)" : "Initial (30%)";

  const logoUrl = "https://qualty.ai/assets/QualtyLogo-BQfT8ydk.png";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; max-width: 720px; margin: auto; border: 1px solid #e6e6e6;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <img src="${logoUrl}" alt="Qualty.ai" style="height:44px;object-fit:contain"/>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:14px">Payment Notification</div>
          <div style="color:#666;font-size:12px">${formattedTime}</div>
        </div>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:13px;color:#444;font-weight:700;margin-bottom:6px">Customer</div>
          <div style="font-size:13px;color:#222">${customer?.name || "N/A"}</div>
          <div style="font-size:12px;color:#666">${customer?.email || "N/A"} • ${customer?.mobileNumber || "N/A"}</div>
        </div>

        <div style="flex:1">
          <div style="font-size:13px;color:#444;font-weight:700;margin-bottom:6px">Inspection</div>
          <div style="font-size:13px;color:#222">${bid?.enquiry?.commodityCategory || bid?.enquiry?.inspectionBudget || "N/A"}</div>
          <div style="font-size:12px;color:#666">${bid?.enquiry?.location || "N/A"} • ${bid?.enquiry?.country || "N/A"}</div>
        </div>
      </div>

      <div style="padding:14px;border:1px solid #f0f0f0;border-radius:8px;margin-top:12px;background:#fafafa">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Invoice Summary</div>
          <div style="font-weight:700">Order: ${payment.razorpayOrderId || "N/A"}</div>
        </div>

        <table style="width:100%;margin-top:12px;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#111;color:#fff;text-align:left">
              <th style="padding:10px">Phase</th>
              <th style="padding:10px;text-align:right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #eee">${phaseLabel}</td>
              <td style="padding:10px;text-align:right;border-bottom:1px solid #eee">${paidAmount}</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #eee">Total Paid So Far</td>
              <td style="padding:10px;text-align:right;border-bottom:1px solid #eee">${totalPaid}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:700">Remaining</td>
              <td style="padding:10px;text-align:right;font-weight:700">${remainingAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:18px;font-size:13px;color:#444">
        <div><strong>Inspector:</strong> ${bid?.inspector?.name || "Not assigned"}</div>
        <div style="margin-top:8px"><strong>Payment ID:</strong> ${payment.razorpayPaymentId || payment._id}</div>
      </div>

      <div style="margin-top:20px;font-size:13px;color:#666">
        Login to the admin dashboard to review the inspection workflow.
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <div style="font-size:11px;color:#888">
        Qualty.ai Internal Notification • GSTIN: 29AAMCP9070G1ZV
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Customer Payment Received - ${phaseLabel}`,
    html,
  });
};

module.exports = sendTeamPaymentNotification;
