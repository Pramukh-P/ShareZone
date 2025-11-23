// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ZonePage from "./pages/ZonePage";
import About from "./pages/About";
import PrivacyTerms from "./pages/PrivacyTerms";
import SplashLoader from "./components/SplashLoader";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Simple splash loader while the app wakes up.
    // Increase this if you want the splash to stay longer.
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashLoader />;
  }

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
