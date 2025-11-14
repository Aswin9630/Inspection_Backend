const {transporter} = require("../../../utils/sendVerificationEmail");
const { paymentHtml, enquiryHtml, formatCurrency } = require("./templates");

const TEAM_EMAILS = (process.env.EMAIL_USER || "").split(",").map((s) => s.trim()).filter(Boolean); 

async function sendPaymentNotification({ user, order, payment, items = [], totals = {}, company = {} }) {
  const amountMajor = typeof payment.amount === "number" ? payment.amount / 100 : (payment.amount || 0);
  const txt = `
Hi ${user?.name || user?.email},

We received your payment of ${formatCurrency(amountMajor, payment.currency || totals.currency || "INR")}.

Order ID: ${payment.razorpay_order_id || "-"}
Payment ID: ${payment.razorpay_payment_id || "-"}

Location: ${order?.items?.[0]?.location || order?.country || "-"}
Commodity: ${order?.items?.[0]?.commodity || items?.[0]?.description || "-"}
Inspection Date: ${order?.items?.[0]?.date || "-"}

If you need any help, reply to this email.
  `;

  const html = paymentHtml({ user, order, payment, items, totals, company });

  const mailCustomer = {
    from: `"${company?.name || "Qualty.ai"}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Qualty.ai — Payment received and request confirmed",
    text: txt,
    html,
  };

  const mailTeam = {
    from: `"${company?.name || "Qualty.ai"}" <${process.env.EMAIL_USER}>`,
    to: TEAM_EMAILS.length ? TEAM_EMAILS[0] : process.env.EMAIL_USER,
    bcc: TEAM_EMAILS.slice(1),
    subject: `New paid request — ${user?.name || user?.email} — ${payment?.razorpay_order_id || payment?._id || ""}`,
    text: txt + "\n\nRaw payment JSON:\n" + JSON.stringify(payment, null, 2) + "\n\nOrder snapshot:\n" + JSON.stringify(order, null, 2),
    html,
  };

  await Promise.all([transporter.sendMail(mailCustomer), transporter.sendMail(mailTeam)]);
}

async function sendEnquiryNotification({ user, cartItem, note = "", company = {} }) {
  const txt = `
Hi ${user?.name || user?.email},

We received your enquiry.

Service: ${cartItem.serviceType || "-"}
Location: ${cartItem.location || "-"}, ${cartItem.country || "-"}
Commodity: ${cartItem.commodity || "-"}
Volume: ${cartItem.volume || "-"} ${cartItem.unit || ""}

We will follow up shortly.
  `;

  const html = enquiryHtml({ user, cartItem, company, note });

  const mailCustomer = {
    from: `"${company?.name || "Qualty.ai"}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Qualty.ai — Enquiry received",
    text: txt,
    html,
  };

  const mailTeam = {
    from: `"${company?.name || "Qualty.ai"}" <${process.env.EMAIL_USER}>`,
    to: TEAM_EMAILS.length ? TEAM_EMAILS[0] : process.env.EMAIL_USER,
    bcc: TEAM_EMAILS.slice(1),
    subject: `New enquiry — ${user?.name || user?.email} — ${cartItem.location || cartItem.country || ""}`,
    text: txt + "\n\nCart item:\n" + JSON.stringify(cartItem, null, 2),
    html,
  };

  await Promise.all([transporter.sendMail(mailCustomer), transporter.sendMail(mailTeam)]);
}

module.exports = { sendPaymentNotification, sendEnquiryNotification };
