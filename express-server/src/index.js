const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {},
});

const room = "stdroom";
gameState = { stdroom: {} };

io.on("connection", (socket) => {
  console.log(`New connection from ${socket.id}`);
  socket.emit("initialization", gameState[room]); // emit message only to connected client
  socket.join(room); // join room std
  socket.on("disconnect", () => {
    delete gameState[room][socket.id];
    io.sockets.in(room).emit("player_despawned", socket.id);
    console.log(`${socket.id} disconnected`);
  });
  socket.on("player_init", (data) => {
    Object.keys(gameState[room]).forEach((socketId) =>
      io
        .to(socketId)
        .emit("new_player_spawned", { ...data, socketId: socket.id })
    );
    gameState[room][socket.id] = data;
  });
  socket.on("player_move", (data) => {
    Object.keys(gameState[room])
      .filter((socketId) => socketId != socket.id)
      .forEach((socketId) =>
        io.to(socketId).emit("player_moved", { ...data, socketId: socket.id })
      );
    gameState[room][socket.id] = data;
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
