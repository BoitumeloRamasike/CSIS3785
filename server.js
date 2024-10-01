"use strict";

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = new Map();
const MAX_PLAYERS = 4;
let gryoscopeGlobalData = {};

let prevRes = {
  gamma: 0,
  beta: 0,
};

io.on("connection", (socket) => {
  socket.on("createRoom", () => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, { host: socket.id, players: [] });
    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
  });

  socket.on("joinRoom", ({ name, roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      if (room.players.length >= MAX_PLAYERS) {
        socket.emit("error", "Room is full");
      } else {
        room.players.push({
          id: socket.id,
          name: name,
          pid: room.players.length,
        });
        socket.join(roomCode);
        io.in(roomCode).emit("playerJoined", { name, room });
        io.to(roomCode).emit("updatePlayerList", room.players);

        socket.emit("joinedRoom", { roomCode, isHost: false });

        // Check if room is full after joining
        if (room.players.length === MAX_PLAYERS) {
          io.to(roomCode).emit("roomFull");
        }
      }
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("startGame", (roomCode) => {
    const room = rooms.get(roomCode);
    if (room && room.host === socket.id) {
      io.to(roomCode).emit("gameStarted", { room });
    }
  });

  socket.on("transmitMap", ({ map, roomCode }) => {
    const room = rooms.get(roomCode);
    let column = Math.random();
    let row = Math.random();
    console.log(column, row);
    io.to(roomCode).emit("receieveMap", { map, room, column, row, roomCode });
  });

  socket.on("gyroscopeData", ({ roomCode, data }) => {
    let res = { gamma: 0, beta: 0 };
    const room = rooms.get(roomCode);

    if (gryoscopeGlobalData[socket.id] !== undefined) {
      gryoscopeGlobalData[socket.id] = data;
    } else {
      gryoscopeGlobalData[socket.id] = data;
    }

    if (room) {
      Object.keys(gryoscopeGlobalData).forEach((key) => {
        let data1 = gryoscopeGlobalData[key];
        res.gamma += data1.gamma;
        res.beta += data1.beta;
      });

      res.gamma = res.gamma / room.players.length;
      res.beta = res.beta / room.players.length;

      io.to(roomCode).emit("gyroscopeUpdate", {
        playerId: socket.id,
        data: data,
        room: room,
      });
      io.in(roomCode).emit("updateBall", {
        data: res,
        host: room.host == socket.id,
      });

      prevRes = res;
    }
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        socket.to(roomCode).emit("playerLeft", { name: player.name });
        io.to(room.host).emit("updatePlayerList", room.players);
      }
    });
  });
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

const PORT = process.env.PORT || 1337;

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
