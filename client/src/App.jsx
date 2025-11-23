// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ZonePage from "./pages/ZonePage";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import SplashLoader from "./components/SplashLoader";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Simple splash: shows while the app starts.
    // You can increase the timeout if Render wake-up takes longer.
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashLoader />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/zone/:zoneId" element={<ZonePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </BrowserRouter>
  );
}
