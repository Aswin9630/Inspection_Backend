const Customer = require("../../models/Customer/customerModel");
const QuickInspection = require("../../models/InspectionCompany/QuickInspection");
const InspectionRequest = require("../../models/QuickInspection/InspectionRequest");
const InspectionCompany = require("../../models/InspectionCompany/inspectionCompamyModel");
const { sendMail } = require("../../utils/EmailServices/QuickInspection/mailService");

const PLATFORM_MARGIN = 0.45;
const GST_RATE = 0.18;

const computeOriginalAmount = (amount, currency) => {
  if (currency === "₹") {
    return Math.round(amount / ((1 + PLATFORM_MARGIN) * (1 + GST_RATE)));
  }
  return Math.round(amount / (1 + PLATFORM_MARGIN));
};

exports.createInspectionRequestController = async (req, res) => {
  try {
    const { companyId, service, commodity, inspectionDate, location, pricing } = req.body;

    if (!companyId || !service || !commodity || !inspectionDate || !location || !pricing) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const allowed = ["psi", "loading", "stuffing", "destination"];
    if (!allowed.includes(service)) {
      return res.status(400).json({ success: false, message: "Invalid service" });
    }

    const quick = await QuickInspection.findOne({ company: companyId });
    if (!quick) return res.status(404).json({ success: false, message: "Company not found" });

    const exists = quick.indiaRegions.concat(quick.intlRegions).some((region) =>
      region.locations.some((loc) => loc.services[service] && loc.services[service].confirmed)
    );
    if (!exists) {
      return res.status(400).json({ success: false, message: "Company does not provide this service" });
    }

    const customerAmount = parseFloat(pricing.amount);
    const originalAmount = computeOriginalAmount(customerAmount, pricing.currency);
    const isIndia = pricing.currency === "₹";
    const gstAmount = isIndia ? Math.round(customerAmount - customerAmount / (1 + GST_RATE)) : 0;
    const baseAmount = Math.round(customerAmount - gstAmount);
    const year = new Date().getFullYear();

    const request = await InspectionRequest.create({
      customer: req.user._id,
      company: companyId,
      service,
      commodity,
      inspectionDate,
      location,
      pricing: { currency: pricing.currency, amount: customerAmount, originalAmount }
    });

    const company = await InspectionCompany.findById(companyId);
    const customer = await Customer.findById(req.user._id);

    const companyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#000;padding:28px 36px;"><div style="font-size:22px;font-weight:800;color:#fff;">Qualty.ai</div><div style="font-size:11px;color:#888;margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;">New Inspection Request</div></td></tr>
<tr><td style="padding:32px 36px;">
<p style="font-size:15px;color:#333;margin:0 0 20px;">You have received a new quick inspection request via the Qualty.ai marketplace. Please review and respond from your dashboard.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
<tr style="background:#f8f9fa;"><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;width:42%;">Field</td><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Details</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Service</td><td style="padding:10px 14px;font-size:13px;color:#111;">${service.toUpperCase()}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Commodity</td><td style="padding:10px 14px;font-size:13px;color:#111;">${commodity}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Location</td><td style="padding:10px 14px;font-size:13px;color:#111;">${location.region} – ${location.city}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Inspection Date</td><td style="padding:10px 14px;font-size:13px;color:#111;">${new Date(inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Customer Name</td><td style="padding:10px 14px;font-size:13px;color:#111;">${customer.name}</td></tr>
<tr style="border-top:2px solid #000;background:#000;"><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">Your Earnings</td><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">${pricing.currency}${originalAmount.toLocaleString("en-IN")}</td></tr>
</table>
<div style="margin-top:24px;padding:14px 18px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;font-size:13px;color:#0369a1;">Log in to your dashboard to <strong>Accept</strong> or <strong>Reject</strong> this request.</div>
</td></tr>
<tr><td style="padding:20px 36px 28px;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">For queries: <a href="mailto:support@qualty.ai" style="color:#000;font-weight:600;">support@qualty.ai</a></p><p style="font-size:11px;color:#bbb;margin:6px 0 0;">© ${year} Qualty.ai. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;

    const customerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#000;padding:28px 36px;"><div style="font-size:22px;font-weight:800;color:#fff;">Qualty.ai</div><div style="font-size:11px;color:#888;margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;">Inspection Request Submitted</div></td></tr>
<tr><td style="padding:32px 36px;">
<p style="font-size:15px;color:#333;margin:0 0 6px;">Hi <strong>${customer.name}</strong>,</p>
<p style="font-size:14px;color:#555;margin:0 0 24px;">Your inspection request has been submitted successfully. You will be notified once the company responds.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
<tr style="background:#f8f9fa;"><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;width:42%;">Field</td><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Details</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Service</td><td style="padding:10px 14px;font-size:13px;color:#111;">${service.toUpperCase()}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Commodity</td><td style="padding:10px 14px;font-size:13px;color:#111;">${commodity}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Location</td><td style="padding:10px 14px;font-size:13px;color:#111;">${location.region} – ${location.city}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Inspection Date</td><td style="padding:10px 14px;font-size:13px;color:#111;">${new Date(inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</td></tr>
${isIndia ? `<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Service Amount</td><td style="padding:10px 14px;font-size:13px;color:#111;">₹${baseAmount.toLocaleString("en-IN")}</td></tr><tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">GST (18%)</td><td style="padding:10px 14px;font-size:13px;color:#111;">₹${gstAmount.toLocaleString("en-IN")}</td></tr>` : ""}
<tr style="border-top:2px solid #000;background:#000;"><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">Total Payable</td><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">${pricing.currency}${customerAmount.toLocaleString("en-IN")}</td></tr>
</table>
<div style="margin-top:24px;padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;"><strong>What happens next?</strong> The company will review your request and accept or reject it. You will receive an email notification with their decision.</div>
</td></tr>
<tr><td style="padding:20px 36px 28px;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">For queries: <a href="mailto:support@qualty.ai" style="color:#000;font-weight:600;">support@qualty.ai</a></p><p style="font-size:11px;color:#bbb;margin:6px 0 0;">© ${year} Qualty.ai. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;

    const adminHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#000;">New Marketplace Inspection Request</h2>
<table style="width:100%;border-collapse:collapse;margin-top:16px;">
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Customer</td><td style="padding:8px;border:1px solid #eee;">${customer.name} (${customer.email})</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company</td><td style="padding:8px;border:1px solid #eee;">${company.companyName} (${company.companyEmail})</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Service</td><td style="padding:8px;border:1px solid #eee;">${service.toUpperCase()}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Commodity</td><td style="padding:8px;border:1px solid #eee;">${commodity}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Date</td><td style="padding:8px;border:1px solid #eee;">${new Date(inspectionDate).toLocaleDateString()}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Location</td><td style="padding:8px;border:1px solid #eee;">${location.region} – ${location.city}</td></tr>
${isIndia ? `<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Base Amount</td><td style="padding:8px;border:1px solid #eee;">${pricing.currency}${baseAmount.toLocaleString("en-IN")}</td></tr><tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">GST (18%)</td><td style="padding:8px;border:1px solid #eee;">${pricing.currency}${gstAmount.toLocaleString("en-IN")}</td></tr>` : ""}
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Customer Pays</td><td style="padding:8px;border:1px solid #eee;">${pricing.currency}${customerAmount.toLocaleString("en-IN")}${isIndia?" (incl. 18% GST)":""}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company Earns</td><td style="padding:8px;border:1px solid #eee;">${pricing.currency}${originalAmount.toLocaleString("en-IN")}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Platform Revenue</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${pricing.currency}${Math.round(customerAmount - originalAmount).toLocaleString("en-IN")}</td></tr>
</table></div>`;

    await Promise.allSettled([
      sendMail({ to: company.companyEmail, subject: "New Inspection Request – Qualty.ai", html: companyHtml }),
      sendMail({ to: customer.email, subject: "Your Inspection Request – Qualty.ai", html: customerHtml }),
      sendMail({ to: process.env.EMAIL_USER, subject: "New Quick Inspection Request", html: adminHtml })
    ]);

    return res.status(201).json({ success: true, message: "Request sent successfully", data: request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.getCompanyRequestsController = async (req, res) => {
  try {
    const requests = await InspectionRequest.find({ company: req.user._id })
      .populate("customer", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.updateRequestStatusController = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const request = await InspectionRequest.findOneAndUpdate(
      { _id: requestId, company: req.user._id },
      { $set: { status } },
      { new: true, runValidators: false }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const customer = await Customer.findById(request.customer).select("name email");
    const company = await InspectionCompany.findById(req.user._id).select("companyName");
    const isAccepted = status === "accepted";
    const year = new Date().getFullYear();

    const customerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#000;padding:28px 36px;"><div style="font-size:22px;font-weight:800;color:#fff;">Qualty.ai</div><div style="font-size:11px;color:#888;margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;">Inspection Request ${isAccepted ? "Accepted ✅" : "Rejected"}</div></td></tr>
<tr><td style="padding:32px 36px;">
<p style="font-size:15px;color:#333;margin:0 0 6px;">Hi <strong>${customer?.name}</strong>,</p>
<p style="font-size:14px;color:#555;margin:0 0 24px;">Your inspection request has been <strong>${status}</strong> by the inspection company.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
<tr style="background:#f8f9fa;"><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;width:42%;">Field</td><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;">Details</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Service</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.service.toUpperCase()}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Location</td><td style="padding:10px 14px;font-size:13px;color:#111;">${request.location.region} – ${request.location.city}</td></tr>
<tr style="border-top:1px solid #eee;"><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;background:#fafafa;">Inspection Date</td><td style="padding:10px 14px;font-size:13px;color:#111;">${new Date(request.inspectionDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</td></tr>
${isAccepted ? `<tr style="border-top:2px solid #000;background:#000;"><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">Amount Due</td><td style="padding:12px 14px;font-size:13px;font-weight:700;color:#fff;">${request.pricing.currency}${Number(request.pricing.amount).toLocaleString("en-IN")}</td></tr>` : ""}
</table>
<div style="margin-top:24px;padding:14px 18px;background:${isAccepted ? "#f0fdf4;border:1px solid #bbf7d0" : "#fef2f2;border:1px solid #fecaca"};border-radius:8px;font-size:13px;color:${isAccepted ? "#15803d" : "#dc2626"};">
${isAccepted ? "<strong>Next step:</strong> Log in to your dashboard and complete the payment to confirm your inspection booking." : "We're sorry your request was not accepted. You may browse other companies in the Qualty.ai marketplace."}
</div>
</td></tr>
<tr><td style="padding:20px 36px 28px;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">For queries: <a href="mailto:support@qualty.ai" style="color:#000;font-weight:600;">support@qualty.ai</a></p><p style="font-size:11px;color:#bbb;margin:6px 0 0;">© ${year} Qualty.ai. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;

    const adminHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2>Request ${status.toUpperCase()}</h2>
<table style="width:100%;border-collapse:collapse;margin-top:16px;">
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company</td><td style="padding:8px;border:1px solid #eee;">${company?.companyName}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Customer</td><td style="padding:8px;border:1px solid #eee;">${customer?.name} (${customer?.email})</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Service</td><td style="padding:8px;border:1px solid #eee;">${request.service.toUpperCase()}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Status</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${status.toUpperCase()}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Amount</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${request.pricing.amount}</td></tr>
<tr><td style="padding:8px;border:1px solid #eee;font-weight:600;background:#f9f9f9;">Company Earns</td><td style="padding:8px;border:1px solid #eee;">${request.pricing.currency}${request.pricing.originalAmount || 0}</td></tr>
</table></div>`;

    const mailTasks = [];
    if (customer?.email) {
      mailTasks.push(sendMail({
        to: customer.email,
        subject: `Inspection Request ${isAccepted ? "Accepted ✅" : "Rejected"} – Qualty.ai`,
        html: customerHtml
      }));
    }
    mailTasks.push(sendMail({ to: process.env.EMAIL_USER, subject: `Quick Inspection Request ${status.toUpperCase()}`, html: adminHtml }));

    await Promise.allSettled(mailTasks);

    return res.status(200).json({ success: true, message: `Request ${status}`, data: request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};








