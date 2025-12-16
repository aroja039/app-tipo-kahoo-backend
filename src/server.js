import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { q } from "./db.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN }));

// Endpoints básicos
app.get("/", (req, res) => {
  res.json({ ok: true, service: "app-tipo-kahoo-backend" });
});

// Health + DB (con try/catch para NO botar el proceso)
app.get("/health", async (req, res) => {
  try {
    const r = await q("select now() as now");
    res.json({ ok: true, dbTime: r.rows[0].now });
  } catch (e) {
    console.error("DB health error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN }
});

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomCode }) => {
    if (!roomCode) return;
    socket.join(`room:${roomCode}`);
    socket.emit("joined_room", { roomCode });
  });
});

// Logs útiles en Render
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const PORT = Number(process.env.PORT || 3000);
// En Render es buena práctica amarrarlo a 0.0.0.0
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});
