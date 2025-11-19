const { transporter } = require("../sendVerificationEmail");

const sendCustomerEnquiryConfirmation = async (customer, enquiry) => {
  const {
    location,
    country,
    urgency,
    category,
    subcategory,
    commodity,
    volume,
    inspectionBudget,
    dateFrom,
    dateTo,
    _id,
    currency
  } = enquiry; 
              
  const currencySymbol = currency === "USD" ? "$" : "₹";

  const formattedFromDate = new Date(dateFrom).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  const formattedToDate = new Date(dateTo).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  const formattedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const logoUrl = "https://qualty.ai/assets/QualtyLogo-BQfT8ydk.png";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; max-width: 720px; margin: auto; border: 1px solid #e6e6e6;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <img src="${logoUrl}" alt="Qualty.ai" style="height:44px;object-fit:contain"/>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:14px">Enquiry Confirmation</div>
          <div style="color:#666;font-size:12px">${formattedTime}</div>
        </div>
      </div>

      <div style="font-size:14px;color:#222;margin-bottom:12px">Hi ${customer?.name || "Customer"},</div>
      <div style="color:#444;font-size:13px">
        Thank you for submitting your inspection enquiry. Below is a summary of your request.
      </div>

      <div style="margin-top:20px;font-size:13px;color:#444">
        <p><strong>Enquiry ID:</strong> ${_id}</p>
        <p><strong>Location:</strong> ${location}, ${country}</p>
        <p><strong>Commodity:</strong> ${category}</p>
        <p><strong>SubCategory:</strong>${subcategory ? subcategory : ""}${commodity ? " , " + commodity : ""}</p>
        <p><strong>Volume:</strong> ${volume} units</p>
        <p><strong>Urgency Level:</strong> ${urgency}</p>
        <p><strong>Inspection Window:</strong> ${formattedFromDate} to ${formattedToDate}</p>
      </div>

      <div style="padding:14px;border:1px solid #f0f0f0;border-radius:8px;margin-top:12px;background:#fafafa">
        <div style="font-weight:700;margin-bottom:8px">Budget Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#111;color:#fff;text-align:left">
              <th style="padding:10px">Description</th>
              <th style="padding:10px;text-align:right">Amount (${currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #eee">Inspection Budget</td>
              <td style="padding:10px;text-align:right;border-bottom:1px solid #eee">${inspectionBudget}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:22px;font-size:13px;color:#666">
        Our team will review your request and notify you once inspectors respond with quotes.
        If you have any queries, contact support@qualty.ai.
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
    subject: "Inspection Enquiry Confirmation - Qualty.ai",
    html,
  });
};

module.exports = sendCustomerEnquiryConfirmation;
