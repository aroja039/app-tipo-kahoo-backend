import { Router } from "express";

const router = Router();

function makeCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

router.post("/", (req, res) => {
  const roomCode = makeCode(6);
  const joinUrl = `${req.protocol}://${req.get("host")}/?code=${roomCode}`;
  return res.json({ ok: true, roomCode, joinUrl });
});

export default router;
