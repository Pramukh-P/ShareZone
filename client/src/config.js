// client/src/config.js

const isDev = import.meta.env.DEV;

// In dev: use local backend
// In production: same-origin API (/api) and same-origin socket
export const API_BASE = isDev
  ? "http://localhost:5000"
  : "/api";

export const SOCKET_URL = isDev
  ? "http://localhost:5000"
  : window.location.origin;
