const { transporter } = require("../sendVerificationEmail");

const sendFinalPaymentConfirmation = async (customer, enquiry, payment, opts = {}) => {
  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const logoUrl = "https://qualty.ai/assets/QualtyLogo-BQfT8ydk.png";

  const inspectorName = enquiry?.confirmedBid?.inspector?.name ||" ";
  const commodity = enquiry?.commodityCategory || "N/A";
  const subCommodity = enquiry?.subCommodity || "";
  const location = enquiry?.inspectionLocation || "N/A";
  const country = enquiry?.country || "N/A";

  const paidAmount = payment.amount || 0;
  const totalPaid = opts.totalPaid ?? paidAmount;
  const remaining = Math.max(0, (opts.totalDue ?? 0) - totalPaid);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; max-width: 720px; margin: auto; border: 1px solid #e6e6e6;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <img src="${logoUrl}" alt="Qualty.ai" style="height:44px;object-fit:contain"/>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:14px">Final Payment Confirmation</div>
          <div style="color:#666;font-size:12px">${formattedTime}</div>
        </div>
      </div>

      <div style="font-size:14px;color:#222;margin-bottom:12px">Hi ${customer?.name || "Customer"},</div>
      <div style="color:#444;font-size:13px">
        Thank you for completing your final payment. Your inspection is now marked as <strong>completed</strong>.
      </div>

      <div style="margin-top:20px;font-size:13px;color:#444">
        <p><strong>Enquiry ID:</strong> ${enquiry._id}</p>
        <p><strong>Location:</strong> ${location}, ${country}</p>
        <p><strong>Commodity:</strong> ${commodity}${subCommodity ? " — " + subCommodity : ""}</p>
        <p><strong>Inspector:</strong> ${inspectorName}</p>
      </div>

      <div style="padding:14px;border:1px solid #f0f0f0;border-radius:8px;margin-top:12px;background:#fafafa">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Invoice Summary</div>
          <div style="font-size:13px">Order: ${payment.razorpayOrderId || "N/A"}</div>
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
              <td style="padding:10px;border-bottom:1px solid #eee">Final (Paid)</td>
              <td style="padding:10px;text-align:right;border-bottom:1px solid #eee">${paidAmount}</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #eee">Total Paid So Far</td>
              <td style="padding:10px;text-align:right;border-bottom:1px solid #eee">${totalPaid}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:700">Remaining</td>
              <td style="padding:10px;text-align:right;font-weight:700">${remaining}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:20px;font-size:13px;color:#444">
        <p><strong>Payment ID:</strong> ${payment.razorpayPaymentId || payment._id}</p>
        <p><strong>Paid At:</strong> ${formattedTime}</p>
      </div>

      <div style="margin-top:22px;font-size:13px;color:#666">
        If you have any questions, reply to this email. Thank you for choosing Qualty.ai.
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <div style="font-size:11px;color:#888">
        Qualty.ai | support@qualty.ai<br />
        GSTIN: 29AAMCP9070G1ZV | CIN: U51909KA2022PTC161277
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: "Final Payment Confirmation - Qualty.ai",
    html,
  });

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to:process.env.EMAIL_USER,
    subject: `Customer ${customer.name} completed final payment`,
    html,
  });
};

module.exports = sendFinalPaymentConfirmation;
