const { transporter } = require("../../utils/sendVerificationEmail");
const ContactEnquiry = require("../../models/Contact/contactEnquiry");

exports.sendContactEnquiry = async (req, res) => {
  try {
    const { name, email,  phone, company, role, message } = req.body;
    if (!name || !email || !phone || !company || !role) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

      const enquiry = await ContactEnquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: company.trim(),
      role,
      message: message?.trim() || "",
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, 
      subject: "New Enquiry from Homepage Contact Form",
      html: `
        <h2>New Contact Form Enquiry</h2>
        <p><strong>Name:</strong> ${enquiry.name}</p>
        <p><strong>Email:</strong> ${enquiry.email}</p>
        <p><strong>Phone:</strong> ${enquiry.phone}</p>
        <p><strong>Company:</strong> ${enquiry.company}</p>
        <p><strong>Role:</strong> ${enquiry.role}</p>
        <p><strong>Message:</strong></p>
        <p>${enquiry.message || "N/A"}</p>
      `,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting Qualty.ai",
      html: `
        <h2>Welcome to Qualty.ai</h2>
        <p>Dear ${enquiry.name},</p>
        <p>Thank you for reaching out to us. Our team will get back to you shortly.</p>
        <p>Meanwhile, feel free to explore <a href="https://qualty.ai">Qualty.ai</a> to learn more about our services.</p>
        <p>Best regards,<br/>The Qualty.ai Team</p>
      `,
    });

    res.json({ success: true, message: "Enquiry sent successfully" });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ success: false, message: "Failed to send enquiry" });
  }
};
