const jwt = require("jsonwebtoken")

const generateTokenAndCookie = async(res,user)=>{
   const token = jwt.sign(
    {id:user._id,role: user.role},
    process.env.ACCESS_TOKEN_SECRET_KEY,
    {expiresIn:process.env.JWT_EXPIRATION}
   )

   res.cookie("token",token, { httpOnly:true, secure: process.env.NODE_ENV === "production",  maxAge:24*60*60*1000, sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" } )

   return token;
}

module.exports = generateTokenAndCookie