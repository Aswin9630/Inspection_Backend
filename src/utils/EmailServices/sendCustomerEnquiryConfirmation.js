const { transporter } = require("../sendVerificationEmail"); 

const sendCustomerEnquiryConfirmation = async (customer, enquiry) => {
  const htmlContent = `
    <h2>Hi ${customer.name},</h2>
    <p>Your inspection enquiry has been successfully submitted on <strong>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</strong>.</p>
    <p><strong>Status:</strong> Received ✅</p>
    <p><strong>Inspection Types:</strong> 
      ${enquiry.inspectionTypes.physical ? "Physical " : ""}
      ${enquiry.inspectionTypes.chemical ? "Chemical" : ""}
    </p>
    <p><strong>Budget:</strong> ₹${enquiry.inspectionBudget}</p>
    <p>Our team will review your request and notify you once inspectors respond with quotes.</p>
    <hr />
    <p><strong>Enquiry Summary:</strong></p>
    <pre>${JSON.stringify(enquiry, null, 2)}</pre>
    <br />
    <p>Thank you for using <strong>Qualty.ai</strong> — your trusted platform for global inspections.</p>
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: "Your Inspection Enquiry Has Been Received",
    html: htmlContent,
  });
};

module.exports = sendCustomerEnquiryConfirmation;
