const isDev = import.meta.env.DEV;

// Development → local backend
// Production → SAME domain (Render) with correct routes
export const API_BASE = isDev
  ? "http://localhost:5000"
  : ""; // <-- FIXED

export const SOCKET_URL = isDev
  ? "http://localhost:5000"
  : window.location.origin;
