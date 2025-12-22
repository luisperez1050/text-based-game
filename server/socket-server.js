
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Health check endpoint for deployment
app.get('/', (req, res) => {
  res.send('Pokemon Battle Server is Running');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Load Pokemon Data
const pokemonData = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/data/pokemon.json'), 'utf8'));

// ROOM MANAGEMENT
const rooms = new Map(); // roomCode -> GameState

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createInitialGameState() {
  return {
    status: 'WAITING',
    round: 1,
    totalRounds: 12,
    scores: { p1: 0, p2: 0 },
    p1Card: null,
    p2Card: null,
    currentTurn: 'p1',
    roundWinner: null,
    logs: ['Waiting for players...'],
    players: { p1: null, p2: null }
  };
}

function addLog(roomCode, msg) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.logs = [msg, ...room.logs].slice(0, 5);
  io.to(roomCode).emit('game_update', sanitizeState(room));
}

// Remove sensitive player IDs before sending to client
function sanitizeState(state) {
  return {
    ...state,
    players: {
      p1: !!state.players.p1, // Send boolean instead of socket ID
      p2: !!state.players.p2
    }
  };
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoom = null;

  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    const state = createInitialGameState();
    
    // Assign creator as P1
    state.players.p1 = socket.id;
    
    rooms.set(roomCode, state);
    currentRoom = roomCode;
    
    socket.join(roomCode);
    socket.emit('room_joined', { roomCode, role: 'p1' });
    socket.emit('game_update', sanitizeState(state));
    
    console.log(`Room ${roomCode} created by ${socket.id}`);
  });

  socket.on('join_room', (roomCode) => {
    roomCode = roomCode.toUpperCase();
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    currentRoom = roomCode;
    socket.join(roomCode);
    
    let role = 'spectator';
    if (!room.players.p1) {
      room.players.p1 = socket.id;
      role = 'p1';
    } else if (!room.players.p2) {
      room.players.p2 = socket.id;
      role = 'p2';
    }
    
    socket.emit('room_joined', { roomCode, role });
    
    if (role !== 'spectator') {
      addLog(roomCode, `Player ${role === 'p1' ? '1' : '2'} joined!`);
    }
    
    // Check if game should start
    if (room.players.p1 && room.players.p2 && room.status === 'WAITING') {
      room.status = 'PLAYING';
      room.logs = ['Game Started! Round 1/12'];
      io.to(roomCode).emit('game_update', sanitizeState(room));
    } else {
      socket.emit('game_update', sanitizeState(room));
    }
  });

  socket.on('draw_card', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Verify turn
    let role = null;
    if (room.players.p1 === socket.id) role = 'p1';
    else if (room.players.p2 === socket.id) role = 'p2';
    
    if (!role || room.currentTurn !== role || room.status !== 'PLAYING') return;

    // Logic
    const randomIndex = Math.floor(Math.random() * pokemonData.length);
    const pokemon = pokemonData[randomIndex];

    if (role === 'p1') {
      room.p1Card = pokemon;
      room.currentTurn = 'p2';
      addLog(currentRoom, `Player 1 drew ${pokemon.name.toUpperCase()} (BST: ${pokemon.totalStats})`);
    } else {
      room.p2Card = pokemon;
      room.currentTurn = null;
      addLog(currentRoom, `Player 2 drew ${pokemon.name.toUpperCase()} (BST: ${pokemon.totalStats})`);
      
      // Resolve Round
      room.status = 'ROUND_RESULT';
      let winner = 'draw';
      if (room.p1Card.totalStats > room.p2Card.totalStats) {
        winner = 'p1';
        room.scores.p1++;
        addLog(currentRoom, `Round ${room.round} Winner: Player 1!`);
      } else if (room.p2Card.totalStats > room.p1Card.totalStats) {
        winner = 'p2';
        room.scores.p2++;
        addLog(currentRoom, `Round ${room.round} Winner: Player 2!`);
      } else {
        addLog(currentRoom, `Round ${room.round} Draw!`);
      }
      room.roundWinner = winner;
      io.to(currentRoom).emit('game_update', sanitizeState(room));
    }
  });

  socket.on('next_round', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    if (room.status === 'ROUND_RESULT') {
      if (room.round >= room.totalRounds) {
        room.status = 'GAME_OVER';
        addLog(currentRoom, 'Game Over!');
      } else {
        room.round++;
        room.p1Card = null;
        room.p2Card = null;
        room.roundWinner = null;
        room.currentTurn = 'p1';
        room.status = 'PLAYING';
        addLog(currentRoom, `Round ${room.round}/${room.totalRounds}`);
      }
      io.to(currentRoom).emit('game_update', sanitizeState(room));
    }
  });

  socket.on('restart_game', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'GAME_OVER') return;
    
    // Reset but keep players
    room.status = 'PLAYING';
    room.round = 1;
    room.scores = { p1: 0, p2: 0 };
    room.p1Card = null;
    room.p2Card = null;
    room.currentTurn = 'p1';
    room.roundWinner = null;
    room.logs = ['Game Restarted! Round 1/12'];
    
    io.to(currentRoom).emit('game_update', sanitizeState(room));
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        if (room.players.p1 === socket.id) {
          room.players.p1 = null;
          addLog(currentRoom, 'Player 1 disconnected');
        } else if (room.players.p2 === socket.id) {
          room.players.p2 = null;
          addLog(currentRoom, 'Player 2 disconnected');
        }
        
        // Cleanup empty rooms eventually? 
        // For now, let's just keep it simple.
        if (!room.players.p1 && !room.players.p2) {
            rooms.delete(currentRoom);
            console.log(`Room ${currentRoom} deleted (empty)`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
