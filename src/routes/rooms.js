// C:\Proyectos\App Tipo Kahoo\backend\src\routes\rooms.js
import express from "express";
import crypto from "crypto";

const router = express.Router();

function genRoomCode(length = 6) {
  // letras/números en mayúscula, sin símbolos raros
  return crypto.randomBytes(16).toString("hex").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
}

router.post("/", (req, res) => {
  const roomCode = genRoomCode(6);

  // Si estás en Render, define PUBLIC_BASE_URL en Render:
  // PUBLIC_BASE_URL=https://app-tipo-kahoo-backend.onrender.com
  const baseUrl = (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.trim())
    ? process.env.PUBLIC_BASE_URL.trim()
    : `${req.protocol}://${req.get("host")}`;

  const joinUrl = `${baseUrl}/?code=${roomCode}`;

  return res.json({ ok: true, roomCode, joinUrl });
});

export default router;
