// server.js
// Simple Node + Express + Socket.IO server for 1v1 rhythm rooms

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// In-memory rooms (reset when server restarts). Each room:
// { id, seed, players: { socketId: {name, ready}}, started, startTime }
const rooms = {};

function makeSeed() {
  return Math.floor(Math.random() * 1e9);
}

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('createRoom', ({ name }, cb) => {
    const id = nanoid(6).toUpperCase();
    rooms[id] = {
      id,
      seed: makeSeed(),
      players: {},
      started: false,
      startTime: null
    };
    socket.join(id);
    rooms[id].players[socket.id] = { name: name || 'Player', ready: false };
    cb({ ok: true, roomId: id });
    io.to(id).emit('roomUpdate', rooms[id]);
    console.log('room created', id);
  });

  socket.on('joinRoom', ({ roomId, name }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ ok: false, error: 'Room not found' });
    if (Object.keys(room.players).length >= 2) return cb({ ok: false, error: 'Room full' });
    socket.join(roomId);
    room.players[socket.id] = { name: name || 'Player', ready: false };
    cb({ ok: true, roomId });
    io.to(roomId).emit('roomUpdate', room);
    console.log(socket.id, 'joined', roomId);
  });

  socket.on('setReady', ({ roomId, ready }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!room.players[socket.id]) return;
    room.players[socket.id].ready = !!ready;
    io.to(roomId).emit('roomUpdate', room);

    // If two players and both ready and not started -> start
    const pIds = Object.keys(room.players);
    if (!room.started && pIds.length === 2 && pIds.every(id => room.players[id].ready)) {
      // choose startTime 3s from now (server time)
      room.started = true;
      room.startTime = Date.now() + 3000;
      io.to(roomId).emit('startDuel', { startTime: room.startTime, seed: room.seed });
      console.log('starting duel in', roomId, 'startTime', room.startTime);
    }
  });

  socket.on('hit', ({ roomId, lane, timeMs }) => {
    // broadcast hit to other player(s)
    socket.to(roomId).emit('opponentHit', { lane, timeMs, from: socket.id });
  });

  socket.on('gameOver', ({ roomId, winner }) => {
    const room = rooms[roomId];
    if (!room) return;
    io.to(roomId).emit('duelEnded', { winner });
    // keep room but mark not started so players can rematch
    room.started = false;
    room.startTime = null;
    Object.keys(room.players).forEach(id => room.players[id].ready = false);
    io.to(roomId).emit('roomUpdate', room);
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // remove from any room
    for (const id of Object.keys(rooms)) {
      if (rooms[id].players[socket.id]) {
        delete rooms[id].players[socket.id];
        io.to(id).emit('roomUpdate', rooms[id]);
        // if empty room -> delete
        if (Object.keys(rooms[id].players).length === 0) {
          delete rooms[id];
          console.log('deleted room', id);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on', PORT));