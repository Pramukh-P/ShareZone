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
                Simple, temporary file sharing spaces
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
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold">
              What is ShareZone?
            </h2>
            <p className="text-sm text-slate-300">
              ShareZone is a small web tool for{" "}
              <span className="text-sz-accent">
                quick, temporary file sharing
              </span>{" "}
              between your devices or a small group of people. Instead of
              creating accounts or long-lived folders, you spin up a{" "}
              <strong>zone</strong> that lives only for a few hours and then
              disappears.
            </p>
          </section>

          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold">How it works (in short)</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
              <li>
                <strong>Create a zone:</strong> choose a zone name, password,
                expiry time (1–5 hours), and your username.
              </li>
              <li>
                <strong>Share details:</strong> send the zone name + password
                to anyone you want to share files with.
              </li>
              <li>
                <strong>Join & upload:</strong> everyone joins with a username
                and can upload files (PDF, images, videos, docs, ZIP) plus an
                optional message per upload batch.
              </li>
              <li>
                <strong>Sections by time:</strong> uploads are grouped by{" "}
                uploader + upload time, so you can quickly see what was shared
                “at 7:15 PM by Alex”.
              </li>
              <li>
                <strong>Auto clean-up:</strong> when the zone expires or the
                owner deletes it, ShareZone removes the zone, its files,
                messages, and sessions from the server.
              </li>
            </ol>
          </section>

          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold">Design principles</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <strong>No accounts:</strong> like simple tools such as
                Dontpad or no-login paste apps, ShareZone doesn&apos;t use
                registration or profiles. You just pick a username for each
                zone.
              </li>
              <li>
                <strong>Short-lived by default:</strong> zones exist only for a
                few hours. This reduces long-term storage and makes it easier to
                keep things tidy.
              </li>
              <li>
                <strong>Local lists, not global history:</strong> the “Live
                Zones” and “Joined Zones” lists are stored only in your browser
                using localStorage. Clearing browser data removes that history
                from your device.
              </li>
              <li>
                <strong>Real-time updates:</strong> zones can update live using
                WebSockets — when someone uploads new files or locks uploads,
                others in the zone see it immediately.
              </li>
              <li>
                <strong>Simple, focused UI:</strong> dark theme with clear
                sections so you can quickly see who uploaded what and when.
              </li>
            </ul>
          </section>

          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">What ShareZone is good for</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Sending slides or documents to classmates or teammates.</li>
              <li>Moving screenshots or PDFs between your own devices.</li>
              <li>Sharing meeting materials quickly without email or chat spam.</li>
              <li>Temporary “drop zones” during a call or online session.</li>
            </ul>
            <p className="text-xs text-slate-500">
              It&apos;s not meant to be a permanent file backup or a full team
              drive. Think of it like a temporary table where everyone can drop
              files for a short time.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
