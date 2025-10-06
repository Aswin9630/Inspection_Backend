const { transporter } = require("../sendVerificationEmail"); 

const sendEnquiryNotification = async (customer, enquiry) => {
  const htmlContent = `
    <h2>New Inspection Enquiry Raised</h2>
    <p><strong>Customer:</strong> ${customer.name} (${customer.email})</p>
    <p><strong>Mobile:</strong> ${customer.mobileNumber}</p>
    <p><strong>Budget:</strong> ₹${enquiry.inspectionBudget}</p>
    <p><strong>Inspection Types:</strong> 
      ${enquiry.inspectionTypes.physical ? "Physical " : ""}
      ${enquiry.inspectionTypes.chemical ? "Chemical" : ""}
    </p>
    <p><strong>Address:</strong> ${customer.address}</p>
    <p><strong>Raised At:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
    <hr />
    <p><strong>Enquiry Details:</strong></p>
    <pre>${JSON.stringify(enquiry, null, 2)}</pre>
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "New Inspection Enquiry Raised",
    html: htmlContent,
  });
};

module.exports = sendEnquiryNotification;
