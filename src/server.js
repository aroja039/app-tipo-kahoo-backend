// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5000").trim();
const FRONTEND_PLAYER_PATH = (process.env.FRONTEND_PLAYER_PATH || "#/player").trim();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// =====================
// In-memory "DB" (temporal)
// =====================
/**
 * rooms: Map<roomCode, { code, createdAt, players: Array<{ id, name, joinedAt }> }>
 * OJO: se reinicia si el server se reinicia (Render/Local).
 */
const rooms = new Map();

function generateRoomCode(len = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function backendBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function buildPlayerUrl(code) {
  const base = FRONTEND_URL.replace(/\/+$/, "");

  let hash = FRONTEND_PLAYER_PATH.trim();
  if (hash.startsWith("/")) hash = hash.slice(1); // '/#/player' -> '#/player'
  if (!hash.startsWith("#")) hash = `#${hash}`;   // 'player' -> '#player'

  // ✅ Query ANTES del hash (esto es lo que tu Flutter está leyendo)
  // Ej: https://...web.app/?code=E32U#/player
  return `${base}/?code=${encodeURIComponent(code)}${hash}`;
}

function ensureRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, { code, createdAt: Date.now(), players: [] });
  }
  return rooms.get(code);
}

// root
app.get("/", (req, res) => {
  res.json({ ok: true, service: "app-tipo-kahoo-backend" });
});

// health
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// create room
app.post("/rooms", (req, res) => {
  const roomCode = generateRoomCode(4);

  // guarda la sala
  rooms.set(roomCode, { code: roomCode, createdAt: Date.now(), players: [] });

  const joinUrl = `${backendBaseUrl(req)}/join?code=${encodeURIComponent(roomCode)}`;
  res.json({ ok: true, roomCode, joinUrl });
});

// JOIN redirect (QR -> frontend player)
app.get("/join", (req, res) => {
  const code = String(req.query.code || "").trim();
  if (!code) return res.status(400).send("Missing ?code=XXXX");

  // opcional: si no existe, la creamos igual (modo demo)
  ensureRoom(code);

  const target = buildPlayerUrl(code);
  return res.redirect(302, target);
});

// ✅ Player JOIN real (REST)
app.post("/rooms/:code/join", (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ ok: false, error: "Missing room code" });

  const room = rooms.get(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });

  const nameRaw = (req.body?.name ?? "").toString().trim();
  const name = nameRaw.length ? nameRaw : "Player";

  const player = {
    id: crypto.randomUUID(),
    name,
    joinedAt: Date.now(),
  };

  room.players.push(player);

  return res.json({
    ok: true,
    roomCode: code,
    player,
    playersCount: room.players.length,
  });
});

// (opcional) ver sala y jugadores (para debug)
app.get("/rooms/:code", (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  res.json({ ok: true, room });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ") || "(none set)"}`);
  console.log(`FRONTEND_URL: ${FRONTEND_URL}`);
  console.log(`FRONTEND_PLAYER_PATH: ${FRONTEND_PLAYER_PATH}`);
});
