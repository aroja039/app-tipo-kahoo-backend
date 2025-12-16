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

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN }
});

app.get("/health", async (req, res) => {
  // prueba real de BD
  const r = await q("select now() as now");
  res.json({ ok: true, dbTime: r.rows[0].now });
});

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomCode }) => {
    if (!roomCode) return;
    socket.join(`room:${roomCode}`);
    socket.emit("joined_room", { roomCode });
  });
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));
