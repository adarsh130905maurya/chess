const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

/* ── Directory for per-game state files ── */
const GAMES_DIR = path.join(__dirname, 'games');
if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR, { recursive: true });

/* ── Game session registry ── */
// gameId → { proc, boardFile, inputFile, lastActivity }
const games = new Map();

const IDLE_TIMEOUT_MS  = 60 * 60 * 1000;  // 1 hour before cleanup
const CLEANUP_INTERVAL = 15 * 60 * 1000;  // run cleanup every 15 min

/* ── Helpers ── */
function boardPath(gameId) { return path.join(GAMES_DIR, `board_${gameId}.txt`); }
function inputPath(gameId) { return path.join(GAMES_DIR, `input_${gameId}.txt`); }

function isValidGameId(id) {
  // UUID format or simple alphanumeric — no path traversal possible
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

/* Spawn a fresh chess child process for the given gameId */
function spawnGame(gameId) {
  const bFile = boardPath(gameId);
  const iFile = inputPath(gameId);

  // Ensure files exist before spawning so the engine can open them immediately
  if (!fs.existsSync(bFile)) fs.writeFileSync(bFile, '');
  if (!fs.existsSync(iFile)) fs.writeFileSync(iFile, '');

  const proc = spawn('./chess', [bFile, iFile]);

  proc.stdout.on('data', d => console.log(`[${gameId.slice(0,8)}] ${d.toString().trim()}`));
  proc.stderr.on('data', d => console.error(`[${gameId.slice(0,8)}] ERR: ${d.toString().trim()}`));

  proc.on('exit', code => {
    console.log(`[${gameId.slice(0,8)}] exited (code ${code})`);
    // Remove from map only if this is still the registered process
    const g = games.get(gameId);
    if (g && g.proc === proc) games.delete(gameId);
  });

  proc.on('error', err => {
    console.error(`[${gameId.slice(0,8)}] spawn error: ${err.message}`);
    games.delete(gameId);
  });

  const entry = { proc, boardFile: bFile, inputFile: iFile, lastActivity: Date.now() };
  games.set(gameId, entry);
  return entry;
}

/* Get existing game or spawn a new one */
function getOrSpawnGame(gameId) {
  const existing = games.get(gameId);
  if (existing) {
    existing.lastActivity = Date.now();
    return existing;
  }
  return spawnGame(gameId);
}

/* Kill a game's process and delete its files */
function destroyGame(gameId) {
  const g = games.get(gameId);
  if (g) {
    try { g.proc.kill(); } catch {}
    games.delete(gameId);
  }
  try { fs.unlinkSync(boardPath(gameId)); } catch {}
  try { fs.unlinkSync(inputPath(gameId)); } catch {}
}

/* ── Middleware ── */
app.use(express.json());
app.use(express.static('public'));

/* ── Routes ── */

/* Generate a new unique game ID */
app.get('/newgame', (req, res) => {
  const gameId = crypto.randomUUID();
  res.json({ gameId });
});

/* Read board state for a game */
app.get('/board', (req, res) => {
  const { gameId } = req.query;
  if (!gameId || !isValidGameId(gameId)) return res.status(400).send('Invalid game ID.');

  const game = getOrSpawnGame(gameId);
  let attempts = 0;

  // Retry briefly — C engine may not have written the file yet on first spawn
  const tryRead = () => {
    fs.readFile(game.boardFile, 'utf8', (err, data) => {
      if (err || !data || !data.trim()) {
        if (attempts++ < 8) return setTimeout(tryRead, 250);
        return res.status(503).json({ error: 'Board not ready yet. Please wait a moment.' });
      }
      try {
        res.json(JSON.parse(data));
      } catch {
        if (attempts++ < 8) return setTimeout(tryRead, 250);
        res.status(500).send('Error parsing board data.');
      }
    });
  };
  tryRead();
});

/* Submit a move */
app.post('/move', (req, res) => {
  const { gameId } = req.query;
  const { move } = req.body;
  if (!gameId || !isValidGameId(gameId)) return res.status(400).send('Invalid game ID.');
  if (!move || typeof move !== 'string') return res.status(400).send('Move not provided.');

  const game = getOrSpawnGame(gameId);
  fs.writeFile(game.inputFile, move.trim(), err => {
    if (err) return res.status(500).send('Error writing move.');
    res.send('Move received.');
  });
});

/* Restart a game — writes RESTART signal to input file, C engine resets itself */
app.post('/restart', (req, res) => {
  const { gameId } = req.query;
  if (!gameId || !isValidGameId(gameId)) return res.status(400).send('Invalid game ID.');

  const game = getOrSpawnGame(gameId);
  fs.writeFile(game.inputFile, 'RESTART', err => {
    if (err) return res.status(500).send('Error sending restart signal.');
    res.json({ ok: true, message: 'Game restarted.' });
  });
});

/* ── Auto-cleanup idle games ── */
setInterval(() => {
  const now = Date.now();
  for (const [gameId, game] of games.entries()) {
    if (now - game.lastActivity > IDLE_TIMEOUT_MS) {
      console.log(`[cleanup] Removing idle game ${gameId.slice(0,8)}...`);
      destroyGame(gameId);
    }
  }
}, CLEANUP_INTERVAL);

/* ── Graceful shutdown ── */
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down ${games.size} game(s)...`);
  for (const [gameId] of games.entries()) destroyGame(gameId);
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

/* ── Start ── */
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
