const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {},
});

let interval;
const room = "stdroom";

io.on("connection", (socket) => {
  const clientAddress = socket.handshake.address;
  console.log(`New connection from ${clientAddress}`);
  socket.emit("initialization", { socketId: socket.id }); // emit message only to connected client
  socket.join(room); // join room std
  if (interval) {
    clearInterval(interval);
  }
  //interval = setInterval(() => broadCastEmit(socket), 1000);
  interval = setInterval(() => broadCastEmit(room), 1000);
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });
  socket.on("player_init", (data) => {
    console.log(data);
  });
  socket.on("player_move", (data) => {
    console.log(data);
  });
});

const broadCastEmit = (room) => {
  const response = new Date();
  io.sockets
    .in(room)
    .emit(
      "broadcast",
      `current date: ${response.toLocaleDateString()} ${response.toLocaleTimeString()}`
    );
};

server.listen(port, () => console.log(`Listening on port ${port}`));
