const WebinarRegistration = require("../../models/WebinarRegistration/WebinarRegistrationModel");
const { transporter, teamWebinarTemplate, customerWebinarTemplate } = require("../../utils/sendVerificationEmail");

const validatePayload = ({ name, phone, email, role }) => {
  const errors = {};
  if (!name || !name.trim()) errors.name = "Name is required";
  if (!phone || !phone.trim()) errors.phone = "Phone is required";
  if (!email || !email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email";
  if (!role || !["exporter","importer","both","logistics","other"].includes(role)) errors.role = "Invalid role";
  return errors;
};

exports.registerWebinar = async (req, res) => {
  try {
    const { name, phone, email, role, consent = true } = req.body;

    const errors = validatePayload({ name, phone, email, role });
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    const registration = await WebinarRegistration.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      role,
      consent: !!consent,
      source: "web",
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Webinar Registration - Qualty.ai",
      html: teamWebinarTemplate({ name, email, phone, role }),
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Qualty.ai Webinar Registration Confirmed",
      html: customerWebinarTemplate({ name }),
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      registrationId: registration._id,
    });
  } catch (err) {
    console.error("Webinar registration error:", err);
    return res.status(500).json({ success: false, message: "Failed to register" });
  }
};
