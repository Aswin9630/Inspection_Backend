const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose")
const LocationPrice = require("../../models/QuickService/LocationPrice")

const data = [
  { "country": "Vietnam", "region": "Haiphong", "currency": "USD", "price": 350 },
  { "country": "Vietnam", "region": "Cat Lai", "currency": "USD", "price": 350 },
  { "country": "Vietnam", "region": "Ho Chi Minh", "currency": "USD", "price": 300 },
  { "country": "China", "region": "Inner Mongolia", "currency": "USD", "price": 350 },
  { "country": "Oman", "region": "Oman", "currency": "USD", "price": 350 },
  { "country": "Dubai", "region": "Dubai", "currency": "USD", "price": 350 },
  { "country": "USA", "region": "Massachusetts", "currency": "USD", "price": 800 },
  { "country": "Thailand", "region": "Thailand", "currency": "USD", "price": 350 },

  { "country": "India", "state": "West Bengal", "region": "Burdwan", "currency": "INR", "price": 1000 },
  { "country": "India", "state": "West Bengal", "region": "Kolkata", "currency": "INR", "price": 1200 },
  { "country": "India", "state": "West Bengal", "region": "Purba", "currency": "INR", "price": 1000 },

  { "country": "India", "state": "Gujarat", "region": "Tarapur", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Gujarat", "region": "Moraj", "currency": "INR", "price": 1200 },
  { "country": "India", "state": "Gujarat", "region": "Songarh", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Gujarat", "region": "Gandhidham", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Gujarat", "region": "Mundra", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Gujarat", "region": "Hazira", "currency": "INR", "price": 1200 },
  { "country": "India", "state": "Gujarat", "region": "Kandla", "currency": "INR", "price": 1200 },

  { "country": "India", "state": "Maharashtra", "region": "Nagpur", "currency": "INR", "price": 1200 },
  { "country": "India", "state": "Maharashtra", "region": "Gondia", "currency": "INR", "price": 1200 },
  { "country": "India", "state": "Maharashtra", "region": "Latur", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Maharashtra", "region": "Sangli", "currency": "INR", "price": 1500 },
  { "country": "India", "state": "Maharashtra", "region": "Mumbai", "currency": "INR", "price": 1200 },

  { "country": "India", "state": "Karnataka", "region": "Raichur", "currency": "INR", "price": 1500 },
  { "country": "India", "state": "Karnataka", "region": "Mandya", "currency": "INR", "price": 1400 },
  { "country": "India", "state": "Karnataka", "region": "Bangarpet", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Karnataka", "region": "Tumkur", "currency": "INR", "price": 1500 },

  { "country": "India", "state": "Tamil Nadu", "region": "Chennai", "currency": "INR", "price": 1500 },

  { "country": "India", "state": "Chhattisgarh", "region": "Raipur", "currency": "INR", "price": 1100 },
  { "country": "India", "state": "Chhattisgarh", "region": "Tilagarh", "currency": "INR", "price": 1100 },
  { "country": "India", "state": "Chhattisgarh", "region": "Kurud", "currency": "INR", "price": 1100 },
  { "country": "India", "state": "Chhattisgarh", "region": "Akaltara", "currency": "INR", "price": 1200 },
  { "country": "India", "state": "Chhattisgarh", "region": "Baradwar", "currency": "INR", "price": 1300 },

  { "country": "India", "state": "Andhra Pradesh", "region": "Nellore", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Andhra Pradesh", "region": "Mandapeta", "currency": "INR", "price": 1300 },
  { "country": "India", "state": "Andhra Pradesh", "region": "Ongole", "currency": "INR", "price": 1500 },
  { "country": "India", "state": "Andhra Pradesh", "region": "Kadapa", "currency": "INR", "price": 1500 },
  { "country": "India", "state": "Andhra Pradesh", "region": "Guntur", "currency": "INR", "price": 1500 },

  { "country": "India", "state": "Uttar Pradesh", "region": "Uttar Pradesh", "currency": "INR", "price": 1500 },

  { "country": "India", "state": "Kerala", "region": "Kerala", "currency": "INR", "price": 2500 },

  { "country": "India", "state": "Telangana", "region": "Telangana", "currency": "INR", "price": 1800 },
];

async function seed() {
  try {

    await mongoose.connect(process.env.MONGODB_URL);

    await LocationPrice.deleteMany({});
    await LocationPrice.insertMany(data);
    console.log("✅ Location prices seeded successfully");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
