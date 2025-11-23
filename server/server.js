// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import { ChatMessage } from "./models/ChatMessage.js";
import { Zone } from "./models/Zone.js";
import { connectDB } from "./config/db.js";
import zoneRoutes from "./routes/zoneRoutes.js";
import { cleanupExpiredZones } from "./utils/zoneCleanup.js";

dotenv.config();

const app = express();

// ---------- HTTP + Socket.io ----------
const httpServer = http.createServer(app);

// ✅ Define allowed origins (for API + Socket.io)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_ORIGIN,      // you can set this to your Vercel URL later
  "https://sharezone-rz39.onrender.com", // old combined origin (optional)
].filter(Boolean);

// ---------- Socket.io with CORS ----------
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

  // 💬 Chat messages (logic kept even if UI not shown)
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
    credentials: false, // no cookies/JWT being used here
  })
);
app.use(express.json());
app.use(cookieParser());

// ---------- API routes ----------
app.use("/api/zones", zoneRoutes);

// ✅ Simple health/root route (optional but nice)
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ShareZone backend is running",
  });
});

// ✅ Fallback 404 for unknown routes
app.use((req, res) => {
  return res.status(404).json({ message: "Not found" });
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`ShareZone server + Socket.io listening on port ${PORT}`);

    // 🔁 Schedule expired-zone cleanup every 5 minutes
    setInterval(() => {
      cleanupExpiredZones().catch((err) => {
        console.error("Error in cleanupExpiredZones:", err);
      });
    }, 5 * 60 * 1000); // 5 minutes
  });
});
