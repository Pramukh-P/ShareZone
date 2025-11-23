// client/src/config.js

// Vite detects this automatically: true in `npm run dev`, false in build
const isDev = import.meta.env.DEV;

// Values that can be set from Vercel / env
const apiBaseFromEnv = import.meta.env.VITE_API_BASE;
const socketUrlFromEnv = import.meta.env.VITE_SOCKET_URL;

// ✅ API base URL
export const API_BASE = isDev
  ? "http://localhost:5000" // local backend in dev
  : apiBaseFromEnv || "https://sharezone-rz39.onrender.com"; 
  // ^ fallback: your Render backend URL (you can change later if needed)

// ✅ Socket.io base URL
export const SOCKET_URL = isDev
  ? "http://localhost:5000" // local backend for sockets in dev
  : socketUrlFromEnv || API_BASE; 
  // usually same host as API in production

export default {
  API_BASE,
  SOCKET_URL,
};
