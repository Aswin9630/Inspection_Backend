// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const InspectionRequest = require("../../models/QuickInspection/InspectionRequest");
// const Customer = require("../../models/Customer/customerModel");
// const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
// const { sendMail } = require("../../utils/EmailServices/QuickInspection/mailService");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// exports.createQuickInspectionOrder = async (req, res) => {
//   try {
//     const { requestId } = req.body;

//     const request = await InspectionRequest.findById(requestId);
//     if (!request || request.customer.toString() !== req.user._id.toString()) {
//       return res.status(404).json({ success: false, message: "Request not found" });
//     }
//     if (request.status !== "accepted") {
//       return res.status(400).json({ success: false, message: "Request not accepted yet" });
//     }
//     if (request.payment.status === "completed") {
//       return res.status(400).json({ success: false, message: "Already paid" });
//     }

//     const amountInPaise = Math.round(request.pricing.amount * 100);

//     const order = await razorpay.orders.create({
//       amount: amountInPaise,
//       currency: "INR",
//       receipt: `qi_${requestId}`,
//       notes: { requestId: requestId.toString() }
//     });

//     request.payment.razorpayOrderId = order.id;
//     await request.save();

//     return res.status(200).json({
//       success: true,
//       orderId: order.id,
//       amount: amountInPaise,
//       currency: "INR",
//       key: process.env.RAZORPAY_KEY_ID
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.verifyQuickInspectionPayment = async (req, res) => {
//   try {
//     const { requestId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

//     const body = razorpayOrderId + "|" + razorpayPaymentId;
//     const expectedSig = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest("hex");

//     if (expectedSig !== razorpaySignature) {
//       return res.status(400).json({ success: false, message: "Payment verification failed" });
//     }

//     const request = await InspectionRequest.findByIdAndUpdate(
//       requestId,
//       {
//         "payment.status": "completed",
//         "payment.razorpayPaymentId": razorpayPaymentId,
//         "payment.razorpaySignature": razorpaySignature,
//         "payment.paidAt": new Date()
//       },
//       { new: true }
//     ).populate("customer company");

//     const customer = request.customer;
//     const company = request.company;
 
//     const customerHtml = `
//       <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
//         <h2 style="color:#16a34a">Payment Confirmed ✅</h2>
//         <p>Hi ${customer?.name}, your payment has been received.</p>
//         <p><b>Amount Paid:</b> ${request.pricing.currency}${request.pricing.amount}</p>
//         <p><b>Service:</b> ${request.service.toUpperCase()}</p>
//         <p><b>Company:</b> ${company?.companyName}</p>
//         <p><b>Inspection Date:</b> ${new Date(request.inspectionDate).toLocaleDateString()}</p>
//         <p><b>Transaction ID:</b> ${razorpayPaymentId}</p>
//       </div>`;

//     const companyHtml = `
//       <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
//         <h2 style="color:#16a34a">Payment Received ✅</h2>
//         <p>Payment for inspection request has been completed by ${customer?.name}.</p>
//         <p><b>Service:</b> ${request.service.toUpperCase()}</p>
//         <p><b>Date:</b> ${new Date(request.inspectionDate).toLocaleDateString()}</p>
//         <p><b>Amount:</b> ${request.pricing.currency}${request.pricing.originalAmount}</p>
//       </div>`;

//     const adminHtml = `
//       <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
//         <h2>Payment Completed</h2>
//         <p><b>Customer:</b> ${customer?.name} (${customer?.email})</p>
//         <p><b>Company:</b> ${company?.companyName}</p>
//         <p><b>Total Collected:</b> ${request.pricing.currency}${request.pricing.amount}</p>
//         <p><b>Platform Revenue:</b> ${request.pricing.currency}${Math.round(request.pricing.amount - request.pricing.originalAmount)}</p>
//         <p><b>Razorpay Payment ID:</b> ${razorpayPaymentId}</p>
//       </div>`;

//     await Promise.all([
//       customer?.email && sendMail({ to: customer.email, subject: "Payment Confirmed – Qualty.ai", html: customerHtml }),
//       company?.companyEmail && sendMail({ to: company.companyEmail, subject: "Inspection Payment Received – Qualty.ai", html: companyHtml }),
//       sendMail({ to: process.env.EMAIL_USER, subject: "Quick Inspection Payment Completed", html: adminHtml })
//     ]);

//     return res.status(200).json({ success: true, message: "Payment verified successfully" });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };








// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const InspectionRequest = require("../../models/QuickInspection/InspectionRequest");
// const Customer = require("../../models/Customer/customerModel");
// const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
// const { sendMail } = require("../../utils/EmailServices/QuickInspection/mailService");

// const isProduction = process.env.NODE_ENV === "production";

// const razorpay = new Razorpay({
//   key_id: isProduction ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID,
//   key_secret: isProduction ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET
// });

// const GST_RATE = 0.18;

// const buildInvoiceEmail = ({
//   invoiceNumber, date, customer, request,
//   baseAmount, gstAmount, totalAmount, currency, isIndia, paymentId
// }) => {
//   const year = new Date().getFullYear();
//   const gstRow = isIndia
//     ? `<tr style="border-top:1px solid #e5e7eb;">
//         <td style="padding:12px 16px;font-size:13px;color:#6b7280;">GST (18%)</td>
//         <td style="padding:12px 16px;text-align:right;font-size:13px;color:#6b7280;">${currency}${gstAmount.toLocaleString("en-IN")}</td>
//        </tr>`
//     : "";

//   return `<!DOCTYPE html>
// <html lang="en">
// <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Invoice – Qualty.ai</title></head>
// <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
// <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:48px 0;">
// <tr><td align="center">
// <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

//   <tr>
//     <td style="background:#000000;padding:40px 48px;">
//       <table width="100%" cellpadding="0" cellspacing="0">
//         <tr>
//           <td style="vertical-align:middle;">
//             <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;">Qualty.ai</div>
//             <div style="font-size:11px;color:#9ca3af;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">Global Inspection &amp; Quality Assurance</div>
//           </td>
//           <td style="text-align:right;vertical-align:middle;">
//             <div style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:800;padding:7px 18px;border-radius:99px;letter-spacing:2px;text-transform:uppercase;">TAX INVOICE</div>
//           </td>
//         </tr>
//       </table>
//     </td>
//   </tr>

//   <tr>
//     <td style="padding:36px 48px 0;">
//       <table width="100%" cellpadding="0" cellspacing="0">
//         <tr>
//           <td style="vertical-align:top;width:50%;">
//             <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Bill To</div>
//             <div style="font-size:17px;font-weight:700;color:#111827;">${customer?.name}</div>
//             <div style="font-size:13px;color:#6b7280;margin-top:3px;">${customer?.email}</div>
//           </td>
//           <td style="text-align:right;vertical-align:top;width:50%;">
//             <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Invoice Details</div>
//             <table cellpadding="0" cellspacing="0" style="margin-left:auto;text-align:right;">
//               <tr><td style="font-size:13px;color:#6b7280;padding-bottom:4px;padding-right:10px;">Invoice No</td><td style="font-size:13px;font-weight:700;color:#111827;padding-bottom:4px;">${invoiceNumber}</td></tr>
//               <tr><td style="font-size:13px;color:#6b7280;padding-bottom:4px;padding-right:10px;">Date</td><td style="font-size:13px;font-weight:700;color:#111827;padding-bottom:4px;">${date}</td></tr>
//               <tr><td style="font-size:13px;color:#6b7280;padding-right:10px;">Payment ID</td><td style="font-size:12px;font-weight:600;color:#374151;">${paymentId}</td></tr>
//             </table>
//           </td>
//         </tr>
//       </table>
//     </td>
//   </tr>

//   <tr><td style="padding:28px 48px 0;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

//   <tr>
//     <td style="padding:28px 48px 0;">
//       <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;">Service Details</div>
//       <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
//         <thead>
//           <tr style="background:#f9fafb;">
//             <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Description</th>
//             <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Amount</th>
//           </tr>
//         </thead>
//         <tbody>
//           <tr style="border-top:1px solid #e5e7eb;">
//             <td style="padding:16px 16px;">
//               <div style="font-size:14px;font-weight:700;color:#111827;">${request.service.toUpperCase()} – Inspection Service</div>
//               <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Commodity: ${request.commodity}</div>
//               <div style="font-size:12px;color:#9ca3af;margin-top:2px;">Location: ${request.location?.region} – ${request.location?.city}</div>
//               <div style="font-size:12px;color:#9ca3af;margin-top:2px;">Inspection Date: ${new Date(request.inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
//             </td>
//             <td style="padding:16px 16px;text-align:right;font-size:14px;font-weight:700;color:#111827;vertical-align:top;">${currency}${baseAmount.toLocaleString("en-IN")}</td>
//           </tr>
//           ${gstRow}
//           <tr style="border-top:2px solid #111827;background:#000000;">
//             <td style="padding:16px 16px;font-size:15px;font-weight:800;color:#ffffff;">Total Paid</td>
//             <td style="padding:16px 16px;text-align:right;font-size:15px;font-weight:800;color:#ffffff;">${currency}${totalAmount.toLocaleString("en-IN")}</td>
//           </tr>
//         </tbody>
//       </table>
//     </td>
//   </tr>

//   <tr>
//     <td style="padding:24px 48px 0;">
//       <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
//         <tr>
//           <td style="padding:16px 20px;">
//             <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:3px;">✅ Payment Successful</div>
//             <div style="font-size:13px;color:#166534;">Your inspection has been confirmed. The inspection company will contact you with further details.</div>
//           </td>
//         </tr>
//       </table>
//     </td>
//   </tr>

//   <tr><td style="padding:28px 48px 0;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

//   <tr>
//     <td style="padding:24px 48px 36px;">
//       <table width="100%" cellpadding="0" cellspacing="0">
//         <tr>
//           <td style="vertical-align:top;">
//             <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:5px;">Need help or have questions?</div>
//             <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;">Our support team is here to assist you.</div>
//             <a href="mailto:support@qualty.ai" style="font-size:13px;color:#000000;font-weight:700;text-decoration:none;">support@qualty.ai</a>
//           </td>
//           <td style="text-align:right;vertical-align:bottom;">
//             <div style="font-size:11px;color:#d1d5db;">© ${year} Qualty.ai</div>
//             <div style="font-size:11px;color:#d1d5db;margin-top:2px;">All rights reserved.</div>
//           </td>
//         </tr>
//       </table>
//     </td>
//   </tr>

// </table>
// </td></tr>
// </table>
// </body>
// </html>`;
// };

// exports.createQuickInspectionOrder = async (req, res) => {
//   try {
//     const { requestId } = req.body;

//     if (!requestId) {
//       return res.status(400).json({ success: false, message: "Request ID required" });
//     }

//     const request = await InspectionRequest.findById(requestId);

//     if (!request || request.customer.toString() !== req.user._id.toString()) {
//       return res.status(404).json({ success: false, message: "Request not found" });
//     }
//     if (request.status !== "accepted") {
//       return res.status(400).json({ success: false, message: "Request not accepted yet" });
//     }
//     if (request.payment?.status === "completed") {
//       return res.status(400).json({ success: false, message: "Already paid" });
//     }

//     const amountInPaise = Math.round(request.pricing.amount * 100);

//     const order = await razorpay.orders.create({
//       amount: amountInPaise,
//       currency: "INR",
//       receipt: `qi_${String(requestId).slice(-12)}`,
//       notes: { requestId: requestId.toString() }
//     });

//     await InspectionRequest.findByIdAndUpdate(
//       requestId,
//       { $set: { "payment.razorpayOrderId": order.id } },
//       { runValidators: false }
//     );

//     return res.status(200).json({
//       success: true,
//       orderId: order.id,
//       amount: amountInPaise,
//       currency: "INR",
//       key: isProduction ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID
//     });
//   } catch (err) {
//     console.error("createQuickInspectionOrder error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.verifyQuickInspectionPayment = async (req, res) => {
//   try {
//     const { requestId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

//     if (!requestId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
//       return res.status(400).json({ success: false, message: "Missing payment fields" });
//     }

//     const secret = isProduction ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

//     const expectedSig = crypto
//       .createHmac("sha256", secret)
//       .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//       .digest("hex");

//     if (expectedSig !== razorpaySignature) {
//       return res.status(400).json({ success: false, message: "Invalid payment signature" });
//     }

//     const request = await InspectionRequest.findByIdAndUpdate(
//       requestId,
//       {
//         $set: {
//           "payment.status": "completed",
//           "payment.razorpayPaymentId": razorpayPaymentId,
//           "payment.razorpaySignature": razorpaySignature,
//           "payment.paidAt": new Date()
//         }
//       },
//       { new: true, runValidators: false }
//     )
//       .populate("customer", "name email")
//       .populate("company", "companyName companyEmail");

//     if (!request) {
//       return res.status(404).json({ success: false, message: "Request not found" });
//     }

//     const customer = request.customer;
//     const company = request.company;
//     const isIndia = request.pricing.currency === "₹";
//     const totalAmount = Number(request.pricing.amount);
//     const gstAmount = isIndia ? Math.round(totalAmount - totalAmount / (1 + GST_RATE)) : 0;
//     const baseAmount = Math.round(totalAmount - gstAmount);
//     const invoiceNumber = `QLTYI-${Date.now().toString(36).toUpperCase()}`;
//     const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

//     const customerInvoiceHtml = buildInvoiceEmail({
//       invoiceNumber,
//       date: invoiceDate,
//       customer,
//       request,
//       baseAmount,
//       gstAmount,
//       totalAmount,
//       currency: request.pricing.currency,
//       isIndia,
//       paymentId: razorpayPaymentId
//     });

//     const year = new Date().getFullYear();

//     const companyNotifyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
// <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
// <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
// <tr><td align="center">
// <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
// <tr><td style="background:#000;padding:28px 36px;"><div style="font-size:22px;font-weight:800;color:#fff;">Qualty.ai</div><div style="font-size:11px;color:#888;margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;">Booking Confirmed – Payment Received</div></td></tr>
// <tr><td style="padding:32px 36px;">
// <p style="font-size:15px;color:#333;margin:0 0 20px;">A customer has completed payment and confirmed their inspection booking with your company.</p>
// <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
// <tr style="background:#f8f9fa;"><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;width:45%;">Field</td><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Details</td></tr>
// <tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Service</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.service.toUpperCase()}</td></tr>
// <tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Commodity</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.commodity}</td></tr>
// <tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Location</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.location?.region} – ${request.location?.city}</td></tr>
// <tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Inspection Date</td><td style="padding:10px 14px;font-size:13px;color:#111;">${new Date(request.inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</td></tr>
// <tr style="border-top:2px solid #000;background:#000;"><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">Your Earnings</td><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">${request.pricing.currency}${Number(request.pricing.originalAmount || 0).toLocaleString("en-IN")}</td></tr>
// </table>
// <div style="margin-top:24px;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#15803d;">Please proceed with the inspection as per the scheduled date and location.</div>
// </td></tr>
// <tr><td style="padding:20px 36px 28px;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">For queries: <a href="mailto:support@qualty.ai" style="color:#000;font-weight:600;">support@qualty.ai</a></p><p style="font-size:11px;color:#bbb;margin:6px 0 0;">© ${year} Qualty.ai. All rights reserved.</p></td></tr>
// </table></td></tr></table>
// </body></html>`;

//     const adminHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
// <h2>Payment Completed – Quick Inspection</h2>
// <table style="width:100%;border-collapse:collapse;margin-top:16px;">
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Invoice No</td><td style="padding:8px;border:1px solid #eee;">${invoiceNumber}</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Customer</td><td style="padding:8px;border:1px solid #eee;">${customer?.name} (${customer?.email})</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company</td><td style="padding:8px;border:1px solid #eee;">${company?.companyName} (${company?.companyEmail})</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Service</td><td style="padding:8px;border:1px solid #eee;">${request.service.toUpperCase()}</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Base Amount</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${baseAmount.toLocaleString("en-IN")}</td></tr>
// ${isIndia ? `<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">GST (18%)</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${gstAmount.toLocaleString("en-IN")}</td></tr>` : ""}
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Total Collected</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${request.pricing.currency}${totalAmount.toLocaleString("en-IN")}</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company Payout</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${Number(request.pricing.originalAmount || 0).toLocaleString("en-IN")}</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Platform Revenue</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${request.pricing.currency}${Math.round(totalAmount - Number(request.pricing.originalAmount || 0)).toLocaleString("en-IN")}</td></tr>
// <tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Razorpay Payment ID</td><td style="padding:8px;border:1px solid #eee;">${razorpayPaymentId}</td></tr>
// </table></div>`;

//     const mailTasks = [];
//     if (customer?.email) {
//       mailTasks.push(sendMail({ to: customer.email, subject: `Payment Invoice – Qualty.ai (${invoiceNumber})`, html: customerInvoiceHtml }));
//     }
//     if (company?.companyEmail) {
//       mailTasks.push(sendMail({ to: company.companyEmail, subject: "Inspection Booking Confirmed – Payment Received | Qualty.ai", html: companyNotifyHtml }));
//     }
//     mailTasks.push(sendMail({ to: process.env.EMAIL_USER, subject: `Quick Inspection Payment – ${invoiceNumber}`, html: adminHtml }));

//     await Promise.allSettled(mailTasks);

//     return res.status(200).json({ success: true, message: "Payment verified successfully", invoiceNumber });
//   } catch (err) {
//     console.error("verifyQuickInspectionPayment error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };














const crypto = require("crypto");
const InspectionRequest = require("../../models/QuickInspection/InspectionRequest");
const PaymentTransaction = require("../../models/QuickInspection/PaymentTransaction");
const Customer = require("../../models/Customer/customerModel");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
const { sendMail } = require("../../utils/EmailServices/QuickInspection/mailService");
const razorpay = require("../../config/razorpay");

const isProduction = process.env.NODE_ENV === "production";
 

const GST_RATE = 0.18;

const buildInvoiceEmail = ({
  invoiceNumber, date, customer, request,
  baseAmount, gstAmount, totalAmount, currency, isIndia, paymentId
}) => {
  const year = new Date().getFullYear();
  const gstRow = isIndia
    ? `<tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">GST (18%)</td>
        <td style="padding:12px 16px;text-align:right;font-size:13px;color:#6b7280;">${currency}${gstAmount.toLocaleString("en-IN")}</td>
       </tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Invoice – Qualty.ai</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:48px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">
  <tr><td style="background:#000000;padding:40px 48px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;"><div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;">Qualty.ai</div><div style="font-size:11px;color:#9ca3af;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">Global Inspection &amp; Quality Assurance</div></td>
      <td style="text-align:right;vertical-align:middle;"><div style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:800;padding:7px 18px;border-radius:99px;letter-spacing:2px;text-transform:uppercase;">TAX INVOICE</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 48px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;width:50%;">
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Bill To</div>
        <div style="font-size:17px;font-weight:700;color:#111827;">${customer?.name}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:3px;">${customer?.email}</div>
      </td>
      <td style="text-align:right;vertical-align:top;width:50%;">
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Invoice Details</div>
        <table cellpadding="0" cellspacing="0" style="margin-left:auto;text-align:right;">
          <tr><td style="font-size:13px;color:#6b7280;padding-bottom:4px;padding-right:10px;">Invoice No</td><td style="font-size:13px;font-weight:700;color:#111827;padding-bottom:4px;">${invoiceNumber}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding-bottom:4px;padding-right:10px;">Date</td><td style="font-size:13px;font-weight:700;color:#111827;padding-bottom:4px;">${date}</td></tr>
          <tr><td style="font-size:13px;color:#6b7280;padding-right:10px;">Payment ID</td><td style="font-size:12px;font-weight:600;color:#374151;">${paymentId}</td></tr>
        </table>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 48px 0;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
  <tr><td style="padding:28px 48px 0;">
    <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;">Service Details</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Description</th>
        <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Amount</th>
      </tr></thead>
      <tbody>
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:16px 16px;">
            <div style="font-size:14px;font-weight:700;color:#111827;">${request.service.toUpperCase()} – Inspection Service</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Commodity: ${request.commodity}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:2px;">Location: ${request.location?.region} – ${request.location?.city}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:2px;">Inspection Date: ${new Date(request.inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
          </td>
          <td style="padding:16px 16px;text-align:right;font-size:14px;font-weight:700;color:#111827;vertical-align:top;">${currency}${baseAmount.toLocaleString("en-IN")}</td>
        </tr>
        ${gstRow}
        <tr style="border-top:2px solid #111827;background:#000000;">
          <td style="padding:16px 16px;font-size:15px;font-weight:800;color:#ffffff;">Total Paid</td>
          <td style="padding:16px 16px;text-align:right;font-size:15px;font-weight:800;color:#ffffff;">${currency}${totalAmount.toLocaleString("en-IN")}</td>
        </tr>
      </tbody>
    </table>
  </td></tr>
  <tr><td style="padding:24px 48px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
      <tr><td style="padding:16px 20px;">
        <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:3px;">✅ Payment Successful</div>
        <div style="font-size:13px;color:#166534;">Your inspection has been confirmed. The company will contact you with further details.</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:28px 48px 0;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
  <tr><td style="padding:24px 48px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;">
        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:5px;">Need help or have questions?</div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;">Our support team is here to assist you.</div>
        <a href="mailto:support@qualty.ai" style="font-size:13px;color:#000000;font-weight:700;text-decoration:none;">support@qualty.ai</a>
      </td>
      <td style="text-align:right;vertical-align:bottom;">
        <div style="font-size:11px;color:#d1d5db;">© ${year} Qualty.ai</div>
        <div style="font-size:11px;color:#d1d5db;margin-top:2px;">All rights reserved.</div>
      </td>
    </tr></table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};

exports.createQuickInspectionOrder = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ success: false, message: "Request ID required" });

    const request = await InspectionRequest.findById(requestId);
    if (!request || request.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (request.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Request not accepted yet" });
    }
    if (request.payment?.status === "completed") {
      return res.status(400).json({ success: false, message: "Already paid" });
    }

    const amountInPaise = Math.round(request.pricing.amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `qi_${String(requestId).slice(-12)}`,
      notes: { requestId: requestId.toString() }
    });

    await InspectionRequest.findByIdAndUpdate(
      requestId,
      { $set: { "payment.razorpayOrderId": order.id } },
      { runValidators: false }
    );

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      key: isProduction ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID
    });
  } catch (err) {
    console.error("createQuickInspectionOrder error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyQuickInspectionPayment = async (req, res) => {
  try {
    const { requestId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!requestId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

    const secret = isProduction ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const paidAt = new Date();

    const request = await InspectionRequest.findByIdAndUpdate(
      requestId,
      {
        $set: {
          "payment.status": "completed",
          "payment.razorpayPaymentId": razorpayPaymentId,
          "payment.razorpaySignature": razorpaySignature,
          "payment.paidAt": paidAt
        }
      },
      { new: true, runValidators: false }
    )
      .populate("customer", "name email")
      .populate("company", "companyName companyEmail");

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    const customer = request.customer;
    const company = request.company;
    const isIndia = request.pricing.currency === "₹";
    const totalAmount = Number(request.pricing.amount);
    const gstAmount = isIndia ? Math.round(totalAmount - totalAmount / (1 + GST_RATE)) : 0;
    const baseAmount = Math.round(totalAmount - gstAmount);
    const companyEarnings = Number(request.pricing.originalAmount || 0);
    const platformRevenue = Math.round(totalAmount - companyEarnings);
    const invoiceNumber = `QLTYI-${Date.now().toString(36).toUpperCase()}`;
    const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    await PaymentTransaction.create({
      inspectionRequest: request._id,
      customer: customer._id,
      company: company._id,
      service: request.service,
      commodity: request.commodity,
      location: request.location,
      inspectionDate: request.inspectionDate,
      currency: request.pricing.currency,
      baseAmount,
      gstAmount,
      totalAmount,
      companyEarnings,
      platformRevenue,
      razorpayOrderId,
      razorpayPaymentId,
      invoiceNumber,
      paidAt
    });

    const customerInvoiceHtml = buildInvoiceEmail({
      invoiceNumber,
      date: invoiceDate,
      customer,
      request,
      baseAmount,
      gstAmount,
      totalAmount,
      currency: request.pricing.currency,
      isIndia,
      paymentId: razorpayPaymentId
    });

    const year = new Date().getFullYear();

    const companyNotifyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#000;padding:28px 36px;"><div style="font-size:22px;font-weight:800;color:#fff;">Qualty.ai</div><div style="font-size:11px;color:#888;margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;">Booking Confirmed – Payment Received</div></td></tr>
<tr><td style="padding:32px 36px;">
<p style="font-size:15px;color:#333;margin:0 0 20px;">A customer has completed payment and confirmed their inspection booking with your company.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
<tr style="background:#f8f9fa;"><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;width:45%;">Field</td><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Details</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Service</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.service.toUpperCase()}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Commodity</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.commodity}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Location</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.location?.region} – ${request.location?.city}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Inspection Date</td><td style="padding:10px 14px;font-size:13px;color:#111;">${new Date(request.inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Invoice No</td><td style="padding:10px 14px;font-size:13px;color:#111;">${invoiceNumber}</td></tr>
<tr style="border-top:2px solid #000;background:#000;"><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">Your Earnings</td><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">${request.pricing.currency}${companyEarnings.toLocaleString("en-IN")}</td></tr>
</table>
<div style="margin-top:24px;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">
  <strong>💳 Payout Information:</strong> The payment will be reflected in your registered bank account within <strong>24 hours</strong> of the inspection being completed and verified by our team.
</div>
<div style="margin-top:14px;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#15803d;">
  Please proceed with the inspection as scheduled. Ensure your bank details are updated in your account settings for timely payout.
</div>
</td></tr>
<tr><td style="padding:20px 36px 28px;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">For queries: <a href="mailto:support@qualty.ai" style="color:#000;font-weight:600;">support@qualty.ai</a></p><p style="font-size:11px;color:#bbb;margin:6px 0 0;">© ${year} Qualty.ai. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;

    const adminHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
<h2>Payment Completed – Quick Inspection</h2>
<table style="width:100%;border-collapse:collapse;margin-top:16px;">
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Invoice No</td><td style="padding:8px;border:1px solid #eee;">${invoiceNumber}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Customer</td><td style="padding:8px;border:1px solid #eee;">${customer?.name} (${customer?.email})</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company</td><td style="padding:8px;border:1px solid #eee;">${company?.companyName} (${company?.companyEmail})</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Service</td><td style="padding:8px;border:1px solid #eee;">${request.service.toUpperCase()}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Base Amount</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${baseAmount.toLocaleString("en-IN")}</td></tr>
${isIndia ? `<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">GST (18%)</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${gstAmount.toLocaleString("en-IN")}</td></tr>` : ""}
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Total Collected</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${request.pricing.currency}${totalAmount.toLocaleString("en-IN")}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company Payout</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${companyEarnings.toLocaleString("en-IN")}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Platform Revenue</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${request.pricing.currency}${platformRevenue.toLocaleString("en-IN")}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Razorpay Payment ID</td><td style="padding:8px;border:1px solid #eee;">${razorpayPaymentId}</td></tr>
</table></div>`;

    const mailTasks = [];
    if (customer?.email) mailTasks.push(sendMail({ to: customer.email, subject: `Payment Invoice – Qualty.ai (${invoiceNumber})`, html: customerInvoiceHtml }));
    if (company?.companyEmail) mailTasks.push(sendMail({ to: company.companyEmail, subject: "Inspection Booking Confirmed – Payment Received | Qualty.ai", html: companyNotifyHtml }));
    mailTasks.push(sendMail({ to: process.env.EMAIL_USER, subject: `Quick Inspection Payment – ${invoiceNumber}`, html: adminHtml }));

    await Promise.allSettled(mailTasks);

    return res.status(200).json({ success: true, message: "Payment verified successfully", invoiceNumber });
  } catch (err) {
    console.error("verifyQuickInspectionPayment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};