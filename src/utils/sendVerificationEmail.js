const nodemailer = require("nodemailer");

 const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendVerificationEmail = async (email, name, token, role) => {
  const link = `${process.env.FRONTEND_PROD_URL}/auth/verify-email?token=${token}&role=${role}`;
  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email",
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Please verify your email to activate your account:</p>
      <a href="${link}" style="padding:10px 20px;background:#22c55e;color:white;border-radius:5px;text-decoration:none;">Verify Email</a>
      <p>This link expires in 10 min.</p>
    `,
  });
};
 
function htmlEscape(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function teamWebinarTemplate({ name, email, phone, role }) {
  return `
  <div style="font-family: Inter, Arial, sans-serif; color:#0F172A;">
    <h2 style="margin:0 0 12px;">New Webinar Registration</h2>
    <p style="margin:0 0 16px;">A new participant registered from the homepage webinar form.</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
      <tr><td><strong>Name:</strong></td><td>${htmlEscape(name)}</td></tr>
      <tr><td><strong>Email:</strong></td><td>${htmlEscape(email)}</td></tr>
      <tr><td><strong>Phone:</strong></td><td>${htmlEscape(phone)}</td></tr>
      <tr><td><strong>Role:</strong></td><td>${htmlEscape(role)}</td></tr>
    </table>
    <p style="margin-top:16px; font-size:12px; color:#64748B;">Qualty.ai · Webinar Registration</p>
  </div>`;
}

function customerWebinarTemplate({ name }) {
  return `
  <div style="font-family: Inter, Arial, sans-serif; color:#0F172A;">
    <h2 style="margin:0 0 12px;">You're registered for the Qualty.ai webinar 🎉</h2>
    <p>Hi ${htmlEscape(name)},</p>
    <p>Thanks for registering! We’ll send you the webinar details and login link shortly.</p>
    <p>Meanwhile, explore <a href="https://qualty.ai" style="color:#2563EB; text-decoration:none;">qualty.ai</a> to learn how we streamline inspections and compliance.</p>
    <hr style="margin:16px 0; border:none; border-top:1px solid #E5E7EB;">
    <p style="font-size:12px; color:#64748B;">
      If you didn’t register for this webinar, simply ignore this email.
    </p>
  </div>`;
}

module.exports = {transporter, sendVerificationEmail, htmlEscape,teamWebinarTemplate,customerWebinarTemplate};
 