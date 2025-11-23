// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ZonePage from "./pages/ZonePage";
import About from "./pages/About";
import PrivacyTerms from "./pages/PrivacyTerms";
import SplashLoader from "./components/SplashLoader";
import { API_BASE } from "./config";

export default function App() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const pingBackend = async (attempt = 1) => {
      try {
        // In prod, API_BASE is your Render URL (from VITE_API_BASE).
        // In dev, it's http://localhost:5000.
        const res = await fetch(`${API_BASE}/api/ping`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error(`Backend responded with ${res.status}`);
        }

        if (!cancelled) {
          setBooting(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Backend not ready yet, retrying ping…", err);

        // Retry with a small backoff: 1s, 2s, 3s… up to 8s between pings
        const delay = Math.min(8000, 1000 * attempt);
        setTimeout(() => {
          pingBackend(attempt + 1);
        }, delay);
      }
    };

    pingBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  // While backend is waking up → show splash screen
  if (booting) {
    return <SplashLoader />;
  }

  // Once backend responds → render the real app
  return (
    <div className="min-h-screen bg-sz-bg text-slate-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/zone/:zoneId" element={<ZonePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<PrivacyTerms />} />
      </Routes>
    </div>
  );
}
