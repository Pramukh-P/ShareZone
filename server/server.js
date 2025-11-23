// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { ChatMessage } from "./models/ChatMessage.js";
import { Zone } from "./models/Zone.js";
import { connectDB } from "./config/db.js";
import zoneRoutes from "./routes/zoneRoutes.js";
import { cleanupExpiredZones } from "./utils/zoneCleanup.js";

dotenv.config();

const app = express();

// ---------- Path helpers (we no longer serve frontend here) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Normalize FRONTEND_ORIGIN: remove any trailing slashes
const rawFrontendOrigin = process.env.FRONTEND_ORIGIN;
const FRONTEND_ORIGIN = rawFrontendOrigin
  ? rawFrontendOrigin.replace(/\/+$/, "")
  : undefined;

// ---------- Allowed origins (CORS) ----------
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  FRONTEND_ORIGIN,                       // e.g. https://sharezone-web.vercel.app
  "https://sharezone-rz39.onrender.com", // backend origin (optional but fine)
].filter(Boolean);

console.log("CORS allowed origins (normalized):", allowedOrigins);

// ---------- HTTP + Socket.io ----------
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});
globalThis.io = io;

// ---------- Socket.io events ----------
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join_zone", ({ zoneId, username }) => {
    console.log(`➡️  Socket ${socket.id} joining zone ${zoneId} as ${username}`);
    socket.join(`zone:${zoneId}`);
    socket.to(`zone:${zoneId}`).emit("user_joined", { username });
  });

  socket.on("leave_zone", ({ zoneId, username }) => {
    console.log(`⬅️  Socket ${socket.id} leaving zone ${zoneId} as ${username}`);
    socket.leave(`zone:${zoneId}`);
    socket.to(`zone:${zoneId}`).emit("user_left", { username });
  });

  // 💬 Chat messages (kept for future UI)
  socket.on("chat_message", async ({ zoneId, username, text }) => {
    try {
      if (!zoneId || !username || !text || !text.trim()) return;

      const zone = await Zone.findById(zoneId);
      if (!zone || zone.isDeleted || zone.expiresAt < new Date()) return;

      const msg = await ChatMessage.create({
        zone: zone._id,
        username,
        text: text.trim(),
      });

      const payload = {
        id: msg._id,
        username: msg.username,
        text: msg.text,
        createdAt: msg.createdAt,
      };

      io.to(`zone:${zoneId}`).emit("chat_message", payload);
    } catch (err) {
      console.error("Error handling chat_message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// ---------- Middlewares ----------
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Explicitly handle preflight for all routes
app.options(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ---------- API routes ----------
app.use("/api/zones", zoneRoutes);

// 🔹 Backend is API-only now (frontend is on Vercel)
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ShareZone backend running" });
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`ShareZone server + Socket.io listening on port ${PORT}`);

    // 🔁 Cleanup expired zones every 5 minutes
    setInterval(() => {
      cleanupExpiredZones().catch((err) => {
        console.error("Error in cleanupExpiredZones:", err);
      });
    }, 5 * 60 * 1000);
  });
});
