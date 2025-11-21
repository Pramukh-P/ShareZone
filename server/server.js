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

// ---------- Path helpers (for serving frontend build) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- HTTP + Socket.io ----------
const httpServer = http.createServer(app);

// For simplicity, allow all origins for Socket.io (fine for this project)
// If you want to tighten later, you can restrict to a specific origin.
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
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

  // 💬 Chat messages (we don't show chat UI now but logic is kept)
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
    origin: true, // reflect the request origin (allows localhost:5173 + Render domain)
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// If you ever want direct static access to uploads, you can uncomment this:
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- API routes ----------
app.use("/api/zones", zoneRoutes);

// ---------- Serve frontend (Vite build) in production ----------
const clientDistPath = path.join(__dirname, "..", "client", "dist");

app.use(express.static(clientDistPath));

app.get("*", (req, res) => {
  // If some unknown /api route falls through, return JSON 404
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Not found" });
  }

  // Otherwise serve the React app
  res.sendFile(path.join(clientDistPath, "index.html"));
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
