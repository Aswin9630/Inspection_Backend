const socket = require("socket.io");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
    },
  });

  io.on("connection", (socket) => {

    socket.on("joinChat",()=>{
      
    })

  });
};

module.exports = initializeSocket;
