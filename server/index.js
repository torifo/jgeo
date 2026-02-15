import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const locations = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'locations.json'), 'utf-8'));

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const TOTAL_ROUNDS = 5;
const rooms = new Map();

function generateRoomId() {
  return nanoid(6).toUpperCase();
}

function shuffleAndPick(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

function sendTo(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function getRoomState(room) {
  return {
    type: 'room_state',
    roomId: room.id,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      connected: !!p.ws,
    })),
    gameStarted: room.gameStarted,
    timeLimit: room.timeLimit,
  };
}

function getConnectedPlayerIds(room) {
  const ids = [];
  for (const p of room.players.values()) {
    if (p.ws) ids.push(p.id);
  }
  return ids;
}

function checkAllGuessed(room) {
  const round = room.currentRound;
  const guesses = room.guesses.get(round);
  if (!guesses) return false;
  for (const player of room.players.values()) {
    if (player.ws && !guesses.has(player.id)) return false;
  }
  return true;
}

function forceSubmitRemaining(room) {
  const round = room.currentRound;
  if (!room.guesses.has(round)) {
    room.guesses.set(round, new Map());
  }
  const roundGuesses = room.guesses.get(round);

  for (const player of room.players.values()) {
    if (player.ws && !roundGuesses.has(player.id)) {
      // Player didn't guess in time -> 0 points
      roundGuesses.set(player.id, { lat: 0, lng: 0, distance: null, score: 0, timedOut: true });
    }
  }
}

function startRoundTimer(room) {
  clearTimeout(room.roundTimer);
  if (!room.timeLimit || room.timeLimit <= 0) return;

  room.roundTimer = setTimeout(() => {
    // Time's up - force submit for anyone who hasn't guessed
    forceSubmitRemaining(room);
    broadcastToRoom(room.id, { type: 'time_up' });
    processRoundResults(room);
  }, (room.timeLimit + 1) * 1000); // +1 second buffer for network latency
}

function processRoundResults(room) {
  clearTimeout(room.roundTimer);
  const round = room.currentRound;
  const guesses = room.guesses.get(round);
  const location = room.locations[round];

  if (!guesses) return;

  // Prevent double processing
  if (!room._roundProcessed) room._roundProcessed = {};
  if (room._roundProcessed[round]) return;
  room._roundProcessed[round] = true;

  const results = [];
  for (const [playerId, guess] of guesses.entries()) {
    const player = room.players.get(playerId);
    results.push({
      playerId,
      playerName: player?.name || 'Unknown',
      lat: guess.lat,
      lng: guess.lng,
      distance: guess.distance,
      score: guess.score,
      timedOut: guess.timedOut || false,
    });
  }

  // Update cumulative scores
  for (const r of results) {
    const player = room.players.get(r.playerId);
    if (player) {
      player.totalScore = (player.totalScore || 0) + r.score;
    }
  }

  results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  const message = {
    type: 'round_result',
    round,
    location: { lat: location.lat, lng: location.lng, prefecture: location.prefecture, hint: location.hint },
    results,
  };

  broadcastToRoom(room.id, message);

  if (round + 1 >= TOTAL_ROUNDS) {
    const finalScores = Array.from(room.players.values())
      .map((p) => ({ playerId: p.id, playerName: p.name, totalScore: p.totalScore || 0 }))
      .sort((a, b) => b.totalScore - a.totalScore);

    setTimeout(() => {
      broadcastToRoom(room.id, { type: 'game_end', finalScores });
    }, 500);
  }
}

// REST API
app.post('/api/rooms', (req, res) => {
  const roomId = generateRoomId();
  const timeLimit = req.body.timeLimit || 0;
  rooms.set(roomId, {
    id: roomId,
    hostId: null,
    players: new Map(),
    gameStarted: false,
    locations: [],
    currentRound: 0,
    guesses: new Map(),
    timeLimit,
    roundTimer: null,
  });
  res.json({ roomId });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(getRoomState(room));
});

// WebSocket
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let playerId = null;
  let currentRoomId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const roomId = msg.roomId?.toUpperCase();
      const room = rooms.get(roomId);
      if (!room) {
        sendTo(ws, { type: 'error', message: 'ルームが見つかりません' });
        return;
      }
      if (room.gameStarted) {
        sendTo(ws, { type: 'error', message: 'ゲームは既に開始されています' });
        return;
      }
      if (room.players.size >= 100) {
        sendTo(ws, { type: 'error', message: 'ルームが満員です' });
        return;
      }

      playerId = nanoid(10);
      currentRoomId = roomId;

      const player = {
        id: playerId,
        name: msg.playerName || 'ゲスト',
        ws,
        totalScore: 0,
      };
      room.players.set(playerId, player);

      if (!room.hostId) {
        room.hostId = playerId;
      }

      sendTo(ws, { type: 'joined', playerId, roomId });
      broadcastToRoom(roomId, getRoomState(room));
    }

    if (msg.type === 'start_game') {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== playerId) return;
      if (room.players.size < 1) return;

      // Update timeLimit if provided by host
      if (msg.timeLimit !== undefined) {
        room.timeLimit = msg.timeLimit;
      }

      room.gameStarted = true;
      room.locations = shuffleAndPick(locations, TOTAL_ROUNDS);
      room.currentRound = 0;
      room.guesses = new Map();
      room._roundProcessed = {};

      const firstLocation = room.locations[0];
      broadcastToRoom(currentRoomId, {
        type: 'game_start',
        round: 0,
        totalRounds: TOTAL_ROUNDS,
        timeLimit: room.timeLimit,
        location: { imageId: firstLocation.imageId, type: firstLocation.type, imageUrl: firstLocation.imageUrl },
      });

      startRoundTimer(room);
    }

    if (msg.type === 'submit_guess') {
      if (!currentRoomId || !playerId) return;
      const room = rooms.get(currentRoomId);
      if (!room || !room.gameStarted) return;

      const round = room.currentRound;
      if (!room.guesses.has(round)) {
        room.guesses.set(round, new Map());
      }
      const roundGuesses = room.guesses.get(round);
      if (roundGuesses.has(playerId)) return; // Already guessed

      const location = room.locations[round];
      const dist = haversineDistance(msg.lat, msg.lng, location.lat, location.lng);
      const score = Math.round(5000 * Math.exp(-dist / 2000));

      roundGuesses.set(playerId, { lat: msg.lat, lng: msg.lng, distance: dist, score });

      // Broadcast guess count
      broadcastToRoom(currentRoomId, {
        type: 'player_guessed',
        playerId,
        guessedCount: roundGuesses.size,
        totalPlayers: getConnectedPlayerIds(room).length,
      });

      if (checkAllGuessed(room)) {
        processRoundResults(room);
      }
    }

    if (msg.type === 'next_round') {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== playerId) return;

      room.currentRound += 1;
      if (room.currentRound < TOTAL_ROUNDS) {
        const nextLocation = room.locations[room.currentRound];
        broadcastToRoom(currentRoomId, {
          type: 'next_round',
          round: room.currentRound,
          totalRounds: TOTAL_ROUNDS,
          timeLimit: room.timeLimit,
          location: { imageId: nextLocation.imageId, type: nextLocation.type, imageUrl: nextLocation.imageUrl },
        });

        startRoundTimer(room);
      }
    }
  });

  ws.on('close', () => {
    if (currentRoomId && playerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const player = room.players.get(playerId);
        if (player) {
          player.ws = null;
        }

        // If host disconnected, assign new host
        if (room.hostId === playerId) {
          for (const p of room.players.values()) {
            if (p.ws) {
              room.hostId = p.id;
              break;
            }
          }
        }

        // If all disconnected, clean up room after delay
        const allDisconnected = Array.from(room.players.values()).every((p) => !p.ws);
        if (allDisconnected) {
          clearTimeout(room.roundTimer);
          setTimeout(() => {
            const r = rooms.get(currentRoomId);
            if (r && Array.from(r.players.values()).every((p) => !p.ws)) {
              rooms.delete(currentRoomId);
            }
          }, 60000);
        } else {
          broadcastToRoom(currentRoomId, getRoomState(room));

          // Check if remaining players all guessed
          if (room.gameStarted && checkAllGuessed(room)) {
            processRoundResults(room);
          }
        }
      }
    }
  });
});

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`JGeo server running on port ${PORT}`);
});
