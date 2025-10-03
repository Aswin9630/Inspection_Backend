const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendVerificationEmail = async (email, name, token, role) => {
  const link = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}&role=${role}`;

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

module.exports = sendVerificationEmail;
