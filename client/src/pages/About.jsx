// src/pages/About.jsx
import { useNavigate } from "react-router-dom";
import logo from "../assets/ShareZone-Logo1.png";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-sz-bg text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-sz-border/80 bg-slate-950/70 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 flex items-center justify-center">
              <img src={logo} alt="SZ" className="rounded-full" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                ShareZone
              </h1>
              <p className="text-[11px] text-slate-400">
                Simple, temporary file sharing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 border border-sz-border text-slate-200 hover:bg-slate-800 transition"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
          {/* Hero / What it is */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold">
              What is ShareZone?
            </h2>
            <p className="text-sm text-slate-300">
              ShareZone is a quick way to{" "}
              <span className="text-sz-accent">share files for a short time</span>{" "}
              between your devices or with a small group. No accounts, no sign‑ups.
            </p>
            <p className="text-sm text-slate-300">
              You create a temporary space called a <strong>zone</strong>, share
              it with others, exchange files, and everything is cleaned up
              automatically after a few hours.
            </p>
          </section>

          {/* How it works – super short */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">How it works</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
              <li>
                <strong>Create a zone</strong> with a name, password, and short
                time limit.
              </li>
              <li>
                <strong>Share the zone</strong> details or join link with people
                you trust.
              </li>
              <li>
                <strong>Everyone uploads</strong> and downloads the files they
                need.
              </li>
              <li>
                <strong>Zone expires</strong> after a few hours and stored data
                is removed from this service.
              </li>
            </ol>
          </section>

          {/* Key points */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">Why use ShareZone?</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>No account or registration required.</li>
              <li>Designed for short‑term sharing (hours, not days).</li>
              <li>Good for quick hand‑offs in classes, meetings, or calls.</li>
              <li>Files are stored in the cloud only while the zone is active.</li>
            </ul>
            <p className="text-xs text-slate-500">
              ShareZone is <strong>not</strong> a permanent backup or cloud
              drive. If a file matters, save a copy elsewhere too.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
