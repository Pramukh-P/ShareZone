// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ZonePage from "./pages/ZonePage";
import About from "./pages/About";
import PrivacyTerms from "./pages/PrivacyTerms";

function App() {
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

export default App;
