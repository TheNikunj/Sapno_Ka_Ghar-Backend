const { io } = require("socket.io-client");

const socket = io("wss://sapno-ka-ghar-backend.onrender.com", {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("Connected with id:", socket.id);
  socket.emit("joinHome", { homeId: "YOUR_HOME_ID_HERE" });
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected, reason:", reason);
});

socket.on("connect_error", (err) => {
  console.log("Connect error:", err.message);
});
