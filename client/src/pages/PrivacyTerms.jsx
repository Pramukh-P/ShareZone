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
                Privacy &amp; Terms (for this instance)
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
              Privacy &amp; Terms
            </h2>
            <p className="text-sm text-slate-300">
              This page explains how this ShareZone instance handles your data
              and what you are responsible for when you use it. It&apos;s
              written in simple language, not as a formal legal document.
            </p>
          </section>

          {/* 1. What we store */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">1. What is stored on the server</h3>
            <p className="text-sm text-slate-300">
              When you use ShareZone, the server temporarily stores:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>
                <strong>Zone data:</strong> zone name, password hash (not the
                raw password), owner username, owner secret, expiry time,
                upload lock state.
              </li>
              <li>
                <strong>Files:</strong> the uploaded files themselves (in the{" "}
                <code>/uploads</code> folder) plus metadata like file name,
                size, type, who uploaded it, and when.
              </li>
              <li>
                <strong>Upload batches:</strong> groups of files with the
                uploader username, optional message, and timestamp.
              </li>
              <li>
                <strong>User sessions:</strong> username, which zone they joined,
                when they joined, and last seen time (used for “new since last
                visit”).
              </li>
              <li>
                <strong>Chat / messages:</strong> any text messages you send
                along with uploads (if implemented) are stored with your
                username and timestamp.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Passwords are never stored in plain text. Only a hashed version is
              saved so the server can verify the password when someone joins a
              zone.
            </p>
          </section>

          {/* 2. Zone lifetime & deletion */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">
              2. Zone lifetime &amp; automatic deletion
            </h3>
            <p className="text-sm text-slate-300">
              Zones are designed to be <strong>temporary</strong>:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>
                When you create a zone, you choose an expiry time (between 1
                and 5 hours).
              </li>
              <li>
                When the expiry time passes, the zone is considered{" "}
                <strong>expired</strong>. Uploads and downloads from that zone
                are blocked.
              </li>
              <li>
                A cleanup process then deletes the zone, its files, upload
                batches, chat messages, and user sessions from the database and
                removes the files from the server&apos;s storage.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Note: once another user has downloaded a file to their device,
              you cannot delete it from their device. Deletion only applies to
              what is stored on this ShareZone server.
            </p>
          </section>

          {/* 3. Local storage & history */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">
              3. Local storage on your browser
            </h3>
            <p className="text-sm text-slate-300">
              For convenience, ShareZone keeps a small amount of data in{" "}
              <strong>your browser only</strong>:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>
                <strong>Live Zones:</strong> zones you created on this device
                (with their IDs and owner tokens) so you can reopen or delete
                them.
              </li>
              <li>
                <strong>Joined Zones:</strong> zones you joined from this device
                (with your username in that zone).
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              This data is stored via <code>localStorage</code>. Clearing your
              browser data or using a different browser/device will remove or
              change these lists.
            </p>
          </section>

          {/* 4. What we don't do */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">4. What this app is NOT doing</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>No account system, registration, or login.</li>
              <li>No public listing of zones or files.</li>
              <li>No social features, followers, or public profiles.</li>
              <li>No long-term archival or backup of your files.</li>
            </ul>
            <p className="text-xs text-slate-500">
              Depending on how and where this instance is hosted, standard
              server logs (IP address, request time, etc.) may still exist at
              the infrastructure level, as with most web servers.
            </p>
          </section>

          {/* 5. Your responsibilities */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">5. Your responsibilities</h3>
            <p className="text-sm text-slate-300">
              By using ShareZone, you agree that:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>
                You will <strong>not upload illegal or unsafe content</strong>.
              </li>
              <li>
                You will only share files with people you trust and who are
                allowed to see those files.
              </li>
              <li>
                You understand that anyone who has the zone name and password
                can see and download the files in that zone while it&apos;s
                active.
              </li>
              <li>
                You won&apos;t use this tool as the only backup for important
                files, since zones are meant to be temporary.
              </li>
            </ul>
          </section>

          {/* 6. Changes */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">6. Changes to this page</h3>
            <p className="text-sm text-slate-300">
              The behaviour of this ShareZone instance can evolve over time as
              new features are added (for example, better logs, rate limiting, or
              extra security options). When that happens, this page should be
              updated to reflect those changes.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
