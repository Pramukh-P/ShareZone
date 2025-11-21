// client/src/config.js

const isDev = import.meta.env.DEV;

// Dev: talk to local backend
// Prod: same-origin backend on Render
export const API_BASE = isDev
  ? "http://localhost:5000"
  : "";              // ⬅️ empty string in production

export const SOCKET_URL = isDev
  ? "http://localhost:5000"
  : window.location.origin;
