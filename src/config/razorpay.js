// const Razorpay = require("razorpay");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// module.exports = razorpay;

const Razorpay = require("razorpay");

const isProd = process.env.NODE_ENV === "production";

const key_id = isProd ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
const key_secret = isProd ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

if (!key_id || !key_secret) {
  console.error("Razorpay keys missing. Check env variables.");
}

const razorpay = new Razorpay({
  key_id,
  key_secret,
});

module.exports = razorpay;

