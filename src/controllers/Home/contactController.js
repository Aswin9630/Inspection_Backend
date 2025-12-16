const { transporter } = require("../../utils/sendVerificationEmail");

exports.sendContactEnquiry = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, 
      subject: "New Enquiry from Homepage Contact Form",
      html: `
        <h2>New Contact Form Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting Qualty.ai",
      html: `
        <h2>Welcome to Qualty.ai</h2>
        <p>Dear ${name},</p>
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
