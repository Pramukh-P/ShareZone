// src/pages/PrivacyTerms.jsx
import { useNavigate } from "react-router-dom";
import logo from "../assets/ShareZone-Logo1.png";

export default function PrivacyTerms() {
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
                Privacy &amp; Terms (short)
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
          {/* Intro */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold">
              Privacy &amp; Terms
            </h2>
            <p className="text-sm text-slate-300">
              This is a simple overview of how ShareZone handles your data and
              what you should keep in mind when using it. It is not a formal
              legal document.
            </p>
          </section>

          {/* What we store */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">What we store</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>
                Basic zone details (name, expiry, upload lock) and a{" "}
                <strong>hashed</strong> version of the password.
              </li>
              <li>
                Files you upload, stored in a cloud storage provider while the
                zone is active.
              </li>
              <li>
                Simple usage info like usernames inside a zone and who is
                currently online, so the app works in real time.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Passwords are not stored in plain text. They are only kept in a
              hashed form for checks when someone joins a zone.
            </p>
          </section>

          {/* How long data stays */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">How long data stays</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>
                Zones are meant to live only for a few hours. After expiry,
                uploads stop and data is cleaned up from this service.
              </li>
              <li>
                If someone already downloaded a file, it will still stay on
                their device. ShareZone cannot delete files from user devices.
              </li>
            </ul>
          </section>

          {/* Your responsibilities */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">Your responsibilities</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>Do not upload illegal, harmful, or abusive content.</li>
              <li>
                Only share zones and files with people who are allowed to see
                them and whom you trust.
              </li>
              <li>
                Remember that anyone with the zone name and password can access
                that zone while it is live.
              </li>
              <li>
                Do not use ShareZone as your only backup. It is for temporary
                sharing only.
              </li>
            </ul>
          </section>

          {/* Security notes */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">Security notes</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>Use strong, unique passwords for zones.</li>
              <li>
                There is no end‑to‑end encryption between browsers. Files are
                sent over HTTPS and stored securely on the server side, but
                anyone with the correct details can join a live zone.
              </li>
              <li>
                If something looks suspicious, you can stop uploads or delete
                the zone.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
