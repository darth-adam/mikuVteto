/* script.js - multiplayer client
   - Connects to server via Socket.IO
   - Lobby -> Room -> Duel
   - Notes are generated deterministically from server-provided seed
*/

const socket = io();

// UI
const nameInput = document.getElementById('name');
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const roomIn = document.getElementById('room-in');
const lobbyMsg = document.getElementById('lobby-msg');
const lobbySection = document.getElementById('lobby');
const roomSection = document.getElementById('room');
const gameSection = document.getElementById('game');
const roomIdEl = document.getElementById('room-id');
const playersList = document.getElementById('players-list');
const readyBtn = document.getElementById('ready-btn');
const leaveBtn = document.getElementById('leave-btn');
const countdownEl = docume