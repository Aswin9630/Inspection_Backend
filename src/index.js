const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require('http')
const connectDB = require("./config/database")
const authRoutes = require("./routes/authentication/authRouter")
const customerRoutes = require("./routes/customer/customerRouter")
const inspectorRoutes = require("./routes/inspector/inspectorRouter")
const paymentRoutes = require("./routes/payment/paymentRouter")
const quickServicesRoutes = require("./routes/customer/quickServiceRouter")
const adminLocationRoutes = require("./routes/addInspectorLocation/addInspectorLocationDetailsRouter");
const chatRoutes = require("./routes/Chat/chatRouter");
// const newChatRoutes = require("./routes/Chat/NewChatRouter");
const locationPriceRoutes = require("./routes/QuickService/locationPriceRoutes");
const quickServiceRoutes = require("./routes/QuickService/quickServiceRoutes");
const initializeSocket = require("./utils/socket");
// const initializeSocket = require("./utils/NewSocket");

const PORT = process.env.PORT || 3000;
const app = express();
  
app.use(cors({
  origin:process.env.FRONTEND_URL,
  methods:["GET","POST","PATCH","PUT","DELETE"],
  credentials:true,
}
)); 

app.use(express.json());
app.use(cookieParser()); 

app.get("/test",(req,res)=>{ 
  res.json({message:"Testing APIs"}) 
});
app.use("/auth",authRoutes);
app.use("/customer",customerRoutes);
app.use("/inspector", inspectorRoutes); 
app.use("/payment", paymentRoutes);
app.use("/chat", chatRoutes);
// app.use("/newChat", newChatRoutes);
app.use("/quick-services",quickServicesRoutes)
app.use("/admin/locations", adminLocationRoutes);
app.use("/locationPrice", locationPriceRoutes);
app.use("/quickService", quickServiceRoutes);

const server = http.createServer(app)
initializeSocket(server);
 
const serverAndDBconnect = async () => {   
  try { 
    await connectDB();
    server.listen(PORT, () => console.log("Server running on port:" + PORT));
  } catch (error) {
    console.error("Failed to connect to DB or server:", error.message);
    process.exit(1);
  } 
};
serverAndDBconnect();

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({ success: false, message });
});
