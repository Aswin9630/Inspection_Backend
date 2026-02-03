const BASE_URL = process.env.SANDBOX_BASE_URL;
// const BASE_URL = process.env.SANDBOX_TEST_BASE_URL;
const API_KEY = process.env.SANDBOX_API_KEY;
// const API_KEY = process.env.SANDBOX_TEST_API_KEY;
const SECRET_KEY = process.env.SANDBOX_SECRET_KEY;
// const SECRET_KEY = process.env.SANDBOX_TEST_SECRET_KEY;


async function getSandboxToken() {
  const res = await fetch(`${BASE_URL}/authenticate`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "x-api-secret": SECRET_KEY,
    }
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sandbox token error: ${res.status} ${txt}`);
  }
 
  const data = await res.json();
  const token = data.data.access_token;
  if (!token) throw new Error("Sandbox token missing access_token");
  return token;
}

async function verifyPan(panNumber) {
  const token = await getSandboxToken();
  const res = await fetch(`${BASE_URL}/kyc/pan/verify`, {
    method: "POST",
    headers: { 
      "x-api-key": API_KEY,
        Authorization:token,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ pan: panNumber })
  });

  const data = await res.json();
  console.log("pandata",data);
  
  if (!res.ok) {
    throw new Error(data?.message || `PAN verification failed (${res.status})`);
  }
  if (!data || (data.status && data.status !== "valid")) {
    throw new Error("PAN not valid");
  }
  return data;
} 
  
async function verifyGst(gstNumber) {
  const token = await getSandboxToken();
  const res = await fetch(`${BASE_URL}/gst/compliance/public/gstin/search`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
        Authorization:token,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ gstin: gstNumber })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `GST verification failed (${res.status})`);
  }
  if (!data || (data.active !== undefined && data.active !== true)) {
    throw new Error("GST not active/valid");
  }
  return data;
}

module.exports = { verifyPan, verifyGst };
