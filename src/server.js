import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import roomsRouter from "./routes/rooms.js";
import * as db from "./db.js";

const app = express();

// Para que req.protocol sea https detrás de Render/Cloudflare
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Middlewares
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper DB (compatible con varios exports)
const query =
  db.query ||
  (db.pool?.query ? db.pool.query.bind(db.pool) : null) ||
  (db.default?.query ? db.default.query.bind(db.default) : null);

// Routes
app.get("/", (req, res) => res.json({ ok: true, service: "app-tipo-kahoo-backend" }));

app.get("/health", async (req, res) => {
  try {
    if (!query) return res.json({ ok: true, dbTime: null });

    const r = await query("select now() as dbTime");
    const dbTime = r?.rows?.[0]?.dbtime ?? r?.rows?.[0]?.dbTime ?? null;
    return res.json({ ok: true, dbTime });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.use("/rooms", roomsRouter);

// Socket.IO
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("join_room", (payload = {}) => {
    const roomCode = String(payload.roomCode || "").trim().toUpperCase();
    const name = String(payload.name || "player").trim();

    if (!roomCode) {
      socket.emit("joined_room", { ok: false, error: "roomCode requerido" });
      return;
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.name = name;

    socket.emit("joined_room", { ok: true, roomCode, socketId: socket.id });
    socket.to(roomCode).emit("player_joined", { socketId: socket.id, name });
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data?.roomCode;
    if (roomCode) {
      socket.to(roomCode).emit("player_left", {
        socketId: socket.id,
        name: socket.data?.name || "player",
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

