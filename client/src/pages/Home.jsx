// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/ShareZone-Logo1.png";

import { API_BASE } from "../config";

const LIVE_ZONES_KEY = "sharezone_live_zones";
const JOINED_ZONES_KEY = "sharezone_joined_zones";

const initialCreateForm = {
  zoneName: "",
  password: "",
  durationHours: 1,
  username: "",
};

const initialJoinForm = {
  zoneName: "",
  password: "",
  username: "",
};

// ---------- LocalStorage helpers ----------
function loadZones(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveZones(key, zones) {
  localStorage.setItem(key, JSON.stringify(zones));
}

function loadLiveZones() {
  return loadZones(LIVE_ZONES_KEY);
}

function saveLiveZones(zones) {
  saveZones(LIVE_ZONES_KEY, zones);
}

function loadJoinedZones() {
  return loadZones(JOINED_ZONES_KEY);
}

function saveJoinedZones(zones) {
  saveZones(JOINED_ZONES_KEY, zones);
}

function formatExpiry(exp) {
  try {
    return new Date(exp).toLocaleString();
  } catch {
    return exp;
  }
}

export default function Home() {
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [joinForm, setJoinForm] = useState(initialJoinForm);

  const [liveZones, setLiveZones] = useState([]);
  const [joinedZones, setJoinedZones] = useState([]);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const navigate = useNavigate();

  // On mount: load zones from localStorage and clean obvious expired ones
  useEffect(() => {
    const now = Date.now();

    // Live zones
    let storedLive = loadLiveZones();
    const [stillLive, expiredLive] = splitByExpiry(storedLive, now);
    if (expiredLive.length > 0) {
      // Optional: try to delete expired zones from backend (owner only)
      expiredLive.forEach((zone) => {
        if (!zone.ownerToken) return;
        axios
          .delete(`${API_BASE}/zones/${zone.id}`, {
            headers: { "x-owner-token": zone.ownerToken },
          })
          .catch(() => {
            // ignore errors here; backend also has expiry cleanup
          });
      });
      saveLiveZones(stillLive);
    }

    setLiveZones(stillLive);

    // Joined zones
    let storedJoined = loadJoinedZones();
    const [stillJoined] = splitByExpiry(storedJoined, now);
    if (stillJoined.length !== storedJoined.length) {
      saveJoinedZones(stillJoined);
    }
    setJoinedZones(stillJoined);
  }, []);

  // Utility: split zones into [notExpired, expired]
  function splitByExpiry(zones, nowMs) {
    const notExpired = [];
    const expired = [];
    zones.forEach((z) => {
      const expMs = new Date(z.expiresAt).getTime();
      if (!isNaN(expMs) && expMs < nowMs) {
        expired.push(z);
      } else {
        notExpired.push(z);
      }
    });
    return [notExpired, expired];
  }

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: name === "durationHours" ? Number(value) : value,
    }));
  };

  const handleJoinChange = (e) => {
    const { name, value } = e.target;
    setJoinForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ---------- Create Zone ----------
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoadingCreate(true);

    try {
      const res = await axios.post(`${API_BASE}/zones`, {
        zoneName: createForm.zoneName,
        password: createForm.password,
        durationHours: createForm.durationHours,
        username: createForm.username,
      });

      const { zone, ownerToken } = res.data;

      const newZoneEntry = {
        id: zone.id,
        zoneName: zone.zoneName,
        ownerToken,
        expiresAt: zone.expiresAt,
        createdBy: createForm.username,
      };

      const updatedLiveZones = [newZoneEntry, ...loadLiveZones()];
      setLiveZones(updatedLiveZones);
      saveLiveZones(updatedLiveZones);

      setInfo("Zone created. Redirecting to zone workspace...");
      setCreateForm(initialCreateForm);

      navigate(`/zone/${zone.id}`, {
        state: {
          username: createForm.username,
          isOwner: true,
          ownerToken,
        },
      });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to create zone. Please try again."
      );
    } finally {
      setLoadingCreate(false);
    }
  };

  // ---------- Join Zone ----------
  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoadingJoin(true);

    try {
      const res = await axios.post(`${API_BASE}/zones/join`, {
        zoneName: joinForm.zoneName,
        password: joinForm.password,
        username: joinForm.username,
      });

      const { zone } = res.data;

      // Store in Joined Zones (this device only)
      const newJoinedEntry = {
        id: zone.id,
        zoneName: zone.zoneName,
        expiresAt: zone.expiresAt,
        joinedAs: joinForm.username,
      };

      const existingJoined = loadJoinedZones();
      // avoid duplicates by id
      const withoutSame = existingJoined.filter((z) => z.id !== zone.id);
      const updatedJoined = [newJoinedEntry, ...withoutSame];
      setJoinedZones(updatedJoined);
      saveJoinedZones(updatedJoined);

      setInfo("Joined zone. Redirecting...");
      const usernameForNav = joinForm.username;
      setJoinForm(initialJoinForm);

      navigate(`/zone/${zone.id}`, {
        state: {
          username: usernameForNav,
          isOwner: false,
          ownerToken: null,
        },
      });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to join zone. Please check details."
      );
    } finally {
      setLoadingJoin(false);
    }
  };

  // ---------- Open / Delete from lists ----------
  const handleOpenLiveZone = (zone) => {
    navigate(`/zone/${zone.id}`, {
      state: {
        username: zone.createdBy || "(owner device)",
        isOwner: true,
        ownerToken: zone.ownerToken,
      },
    });
  };

  const handleDeleteLiveZone = async (zone) => {
    if (!window.confirm(`Delete zone "${zone.zoneName}" for everyone?`)) return;

    try {
      await axios.delete(`${API_BASE}/zones/${zone.id}`, {
        headers: {
          "x-owner-token": zone.ownerToken,
        },
      });

      const updated = loadLiveZones().filter((z) => z.id !== zone.id);
      setLiveZones(updated);
      saveLiveZones(updated);
      setInfo(`Zone "${zone.zoneName}" deleted.`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to delete zone. It may already be expired or removed."
      );
    }
  };

  const handleOpenJoinedZone = (zone) => {
    navigate(`/zone/${zone.id}`, {
      state: {
        username: zone.joinedAs || "(guest)",
        isOwner: false,
        ownerToken: null,
      },
    });
  };

  const handleRemoveJoinedZone = (zone) => {
    // Only remove from this device; does NOT delete from DB
    const updated = loadJoinedZones().filter((z) => z.id !== zone.id);
    setJoinedZones(updated);
    saveJoinedZones(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-sz-bg text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-sz-border/80 bg-slate-950/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 flex items-center justify-center">
              <img src={logo} alt="SZ" className="rounded-full" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                ShareZone
              </h1>
              <p className="text-[11px] text-slate-400">
                file sharing zones • 1–5 hours
              </p>
            </div>
          </div>

          {/* Right side: About & Privacy buttons */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-sz-border text-slate-200 hover:bg-slate-800 transition"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-sz-border text-slate-200 hover:bg-slate-800 transition"
            >
              Privacy &amp; Terms
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
          {/* Global messages */}
          {(error || info) && (
            <div className="space-y-2">
              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                  {info}
                </div>
              )}
            </div>
          )}

          {/* Row 1: Create (left) / Join (right) */}
          <section className="grid gap-4 lg:grid-cols-2 items-start">
            {/* Left: Create Zone */}
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold">
                    Create Zone
                  </h3>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Zone name
                      </label>
                      <input
                        type="text"
                        name="zoneName"
                        value={createForm.zoneName}
                        onChange={handleCreateChange}
                        placeholder="e.g., Project-X"
                        className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={createForm.password}
                        onChange={handleCreateChange}
                        placeholder="Choose a strong password"
                        className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Duration (hours)
                      </label>
                      <select
                        name="durationHours"
                        value={createForm.durationHours}
                        onChange={handleCreateChange}
                        className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                      >
                        {[1, 2, 3, 4, 5].map((h) => (
                          <option key={h} value={h}>
                            {h} hour{h > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Your username
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={createForm.username}
                        onChange={handleCreateChange}
                        placeholder="e.g., Owner1"
                        className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      disabled={loadingCreate}
                      className="inline-flex items-center justify-center rounded-lg bg-sz-accent text-black font-medium text-sm px-4 py-2.5 hover:bg-sz-accent-soft transition shadow-sz-soft disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingCreate ? "Creating..." : "Create Zone"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Join Zone */}
            <div className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Join Zone
                </h3>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Zone name
                    </label>
                    <input
                      type="text"
                      name="zoneName"
                      value={joinForm.zoneName}
                      onChange={handleJoinChange}
                      placeholder="Project-X"
                      className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={joinForm.password}
                      onChange={handleJoinChange}
                      placeholder="Same password as shared"
                      className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Your username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={joinForm.username}
                      onChange={handleJoinChange}
                      placeholder="e.g., Friend1"
                      className="w-full rounded-lg bg-slate-900 border border-sz-border px-3 py-2 text-sm outline-none focus:border-sz-accent"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-end pt-1">
                  <button
                    type="submit"
                    disabled={loadingJoin}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-100 font-medium text-sm px-4 py-2.5 hover:bg-slate-700 border border-sz-border transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingJoin ? "Joining..." : "Enter Zone"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Row 2: Joined Zones (left) / Live Zones (right) */}
          <section className="grid gap-4 lg:grid-cols-2 items-start">
            {/* Live Zones (created as owner) */}
            <div className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold">
                  Live Zones
                </h3>
              </div>

              {/* Fixed-height scroll container */}
              <div className="mt-1 h-64 overflow-y-auto pr-1">
                {liveZones.length === 0 ? (
                  <div className="h-full rounded-xl border border-dashed border-sz-border/80 bg-slate-950/80 px-4 py-6 text-center flex flex-col items-center justify-center">
                    <p className="text-sm text-slate-300 mb-1">
                      No live zones on this device yet.
                    </p>
                    <p className="text-xs text-slate-500">
                      When you create a zone from this browser, it will appear
                      here so you can reopen or delete it quickly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {liveZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between rounded-xl border border-sz-border bg-slate-900/70 px-3 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {zone.zoneName}
                          </div>
                          {zone.createdBy && (
                            <div className="text-[11px] text-slate-400">
                              Created as{" "}
                              <span className="text-sz-accent">
                                {zone.createdBy}
                              </span>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">
                            Expires at {formatExpiry(zone.expiresAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenLiveZone(zone)}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sz-border"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteLiveZone(zone)}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/40 hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Joined Zones */}
            <div className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold">
                  Joined Zones
                </h3>
              </div>

              {/* Fixed-height scroll container */}
              <div className="mt-1 h-64 overflow-y-auto pr-1">
                {joinedZones.length === 0 ? (
                  <div className="h-full rounded-xl border border-dashed border-sz-border/80 bg-slate-950/80 px-4 py-6 text-center flex flex-col items-center justify-center">
                    <p className="text-sm text-slate-300 mb-1">
                      No joined zones yet.
                    </p>
                    <p className="text-xs text-slate-500">
                      When you join a zone using the form above, it will appear
                      here so you can open it again quickly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {joinedZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between rounded-xl border border-sz-border bg-slate-900/70 px-3 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {zone.zoneName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Joined as{" "}
                            <span className="text-sz-accent">
                              {zone.joinedAs || "Guest"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Expires at {formatExpiry(zone.expiresAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenJoinedZone(zone)}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sz-border"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleRemoveJoinedZone(zone)}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/40 hover:bg-red-500/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="bg-slate-950/70 border border-sz-border rounded-2xl p-5 sm:p-6 space-y-4 mt-2">
            <h3 className="text-base sm:text-lg font-semibold mb-1">
              How it works
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-2">
              ShareZone makes quick file sharing simple. Just create a temporary
              zone, share it, and everything cleans up automatically after time
              ends.
            </p>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs sm:text-sm">
              <Step
                title="1. Create a zone"
                text="Choose a name, password, time (1–5 hours), and your username."
              />
              <Arrow />
              <Step
                title="2. Share details"
                text="Send the zone name + password to friends or teammates."
              />
              <Arrow />
              <Step
                title="3. Join & upload"
                text="Everyone joins with their username, uploads files with optional messages."
              />
              <Arrow />
              <Step
                title="4. Auto-clean"
                text="When time ends, the zone and all files/messages are deleted from the server."
              />
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-sz-border/80 bg-slate-950/80 mt-4">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-center text-[11px] sm:text-xs text-slate-500">
          © {new Date().getFullYear()}{" "}
          <span className="text-sz-accent font-medium"> ShareZone</span>. All
          rights reserved.
        </div>
      </footer>
    </div>
  );
}

// Small presentational helpers for "How it works" section
function Step({ title, text }) {
  return (
    <div className="flex-1 min-w-[150px]">
      <div className="inline-flex items-center justify-center rounded-full bg-slate-900 border border-sz-border px-3 py-1 mb-1 text-[11px] text-sz-accent">
        {title}
      </div>
      <p className="text-[11px] sm:text-xs text-slate-400">{text}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:flex items-center justify-center px-2">
      <span className="text-slate-500 text-lg">➜</span>
    </div>
  );
}
