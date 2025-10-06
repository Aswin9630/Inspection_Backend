const { transporter } = require("../sendVerificationEmail"); 

const sendCustomerEnquiryConfirmation = async (customer, enquiry) => {
  const { inspectionLocation, country, urgencyLevel, commodityCategory, subCommodity, volume, inspectionBudget, inspectionDate } = enquiry;

  const formattedFromDate = new Date(inspectionDate.from).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const formattedToDate = new Date(inspectionDate.to).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const plainText = `
Hi ${customer.name},

Your inspection enquiry has been successfully submitted. Here are the details:

📍 Location: ${inspectionLocation}, ${country}
📦 Commodity: ${commodityCategory} - ${subCommodity}
📊 Volume: ${volume} units
⚡ Urgency Level: ${urgencyLevel}
💰 Budget: ₹${inspectionBudget}
📅 Inspection Window: ${formattedFromDate} to ${formattedToDate}

Our team will review your request and notify you once inspectors respond with quotes.

Thank you for choosing Qualty.ai — your trusted platform for global inspections.
  `;

  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: "Your Inspection Enquiry Has Been Received",
    text: plainText,
  });
};


module.exports = sendCustomerEnquiryConfirmation;
