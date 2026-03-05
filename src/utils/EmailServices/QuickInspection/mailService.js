const { transporter } = require("../../sendVerificationEmail");

exports.sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Qualty.ai" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};