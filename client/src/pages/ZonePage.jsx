// src/pages/ZonePage.jsx
import { useEffect, useState, useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import logo from "../assets/ShareZone-Logo1.png";
import { API_BASE, SOCKET_URL } from "../config";

function formatFileSize(bytes) {
  if (bytes == null) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function fileTypeLabel(mime) {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("wordprocessingml")) return "docx";
  if (mime.includes("spreadsheetml")) return "xlsx";
  if (mime.includes("presentationml")) return "pptx";
  if (mime.includes("zip")) return "zip";
  return "file";
}

// 🕒 12-hour date+time (no seconds) for display
function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return ts;
  }
}

// 🕒 Helper: compute label + severity from expiresAt & now
function getTimeLeftInfo(expiresAt, nowMs) {
  if (!expiresAt) return { label: "", isExpired: false, severity: "ok" };

  const diff = new Date(expiresAt).getTime() - nowMs;

  if (diff <= 0) {
    return { label: "Expired", isExpired: true, severity: "danger" };
  }

  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  let label;
  if (hours > 0) {
    label = `${hours}h ${minutes}m ${seconds}s left`;
  } else if (minutes > 0) {
    label = `${minutes}m ${seconds}s left`;
  } else {
    label = `${seconds}s left`;
  }

  let severity = "ok";
  if (diff <= 5 * 60 * 1000) {
    severity = "danger"; // < 5 min
  } else if (diff <= 30 * 60 * 1000) {
    severity = "warn"; // < 30 min
  }

  return { label, isExpired: false, severity };
}

export default function ZonePage() {
  const { zoneId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const fromState = location.state || {};
  const username = fromState.username || "Unknown";
  const isOwner = fromState.isOwner || false;
  const ownerToken = fromState.ownerToken || null;

  const [zoneInfo, setZoneInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoneError, setZoneError] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadInfo, setUploadInfo] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const [lockUpdating, setLockUpdating] = useState(false);

  const [pageEnteredAt] = useState(() => new Date().toISOString());

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 🔍 Filters
  const [filterUsername, setFilterUsername] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterNewOnly, setFilterNewOnly] = useState(false);

  // Manual "Uploaded since" time (12h format)
  const [filterSinceHour, setFilterSinceHour] = useState(""); // "1"–"12"
  const [filterSinceMinute, setFilterSinceMinute] = useState(""); // "0"–"59"
  const [filterSinceAmPm, setFilterSinceAmPm] = useState("am"); // "am" | "pm"

  // 🕒 Live "now" for countdown
  const [now, setNow] = useState(() => Date.now());

  // Extend zone controls (owner only)
  const [extendHours, setExtendHours] = useState(1);
  const [extendLoading, setExtendLoading] = useState(false);

  // Kick-user state
  const [kickLoadingUser, setKickLoadingUser] = useState(null);

  // 👁️ Preview modal state
  const [previewFile, setPreviewFile] = useState(null); // { id, originalName, mimeType, sizeBytes, url }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewObjectUrl, setPreviewObjectUrl] = useState(null);

  // Share link copied state
  const [copiedLink, setCopiedLink] = useState(false);

  const maxSizeMb = 50;
  const allowedTypes = "PDF, images (JPG/PNG/GIF), MP4, DOCX, XLSX, PPTX, ZIP";

  const batches = useMemo(() => zoneInfo?.batches || [], [zoneInfo]);

  const fetchZone = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/zones/${zoneId}`, {
        params: { username },
      });
      setZoneInfo(res.data);
      setZoneError("");
    } catch (err) {
      console.error(err);
      setZoneError(
        err.response?.data?.message ||
          "Failed to load zone. It may have expired or been deleted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  // 🕒 Update "now" every second
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Socket.io: presence + live zone events
  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    setSocket(s);

    s.on("connect", () => {
      console.log("✅ Socket connected (client):", s.id);
      s.emit("join_zone", { zoneId, username });
    });

    s.on("disconnect", () => {
      console.log("❌ Socket disconnected (client):", s.id);
    });

    s.on("user_joined", ({ username: joinedUser }) => {
      setOnlineUsers((prev) => {
        if (prev.includes(joinedUser)) return prev;
        return [...prev, joinedUser];
      });
    });

    s.on("user_left", ({ username: leftUser }) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== leftUser));
    });

    s.on("zone_upload_batch", (batch) => {
      setZoneInfo((prev) => {
        if (!prev) return prev;
        const exists = (prev.batches || []).some(
          (b) => String(b.id) === String(batch.id)
        );
        if (exists) return prev;
        return {
          ...prev,
          batches: [...(prev.batches || []), batch],
        };
      });
    });

    s.on(
      "zone_lock_state",
      ({ zoneId: changedZoneId, uploadsLocked, updatedBy }) => {
        if (changedZoneId !== zoneId) return;
        setZoneInfo((prev) => (prev ? { ...prev, uploadsLocked } : prev));
        setUploadInfo(
          `Uploads ${uploadsLocked ? "locked" : "unlocked"} by ${updatedBy}`
        );
      }
    );

    s.on(
      "zone_extended",
      ({ zoneId: changedZoneId, expiresAt, extendedBy, extraHours }) => {
        if (changedZoneId !== zoneId) return;
        setZoneInfo((prev) => (prev ? { ...prev, expiresAt } : prev));
        setUploadInfo(
          `Zone extended by ${extraHours} hour${
            extraHours > 1 ? "s" : ""
          } by ${extendedBy}`
        );
      }
    );

    // 🛑 User kicked event
    s.on("user_kicked", ({ zoneId: changedZoneId, username: kickedUser }) => {
      if (changedZoneId && String(changedZoneId) !== String(zoneId)) return;
      if (!kickedUser) return;

      if (kickedUser === username) {
        // You are kicked
        alert("You have been removed from this ShareZone by the owner.");
        s.emit("leave_zone", { zoneId, username });
        s.disconnect();
        navigate("/");
      } else {
        // Someone else kicked, remove from list
        setOnlineUsers((prev) => prev.filter((u) => u !== kickedUser));
      }
    });

    // Add ourselves immediately
    setOnlineUsers((prev) => {
      if (prev.includes(username)) return prev;
      return [...prev, username];
    });

    return () => {
      s.emit("leave_zone", { zoneId, username });
      s.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [zoneId, username, navigate]);

  const handleBackHome = () => {
    navigate("/");
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setUploadError("");
    setUploadInfo("");
  };

  // 🕒 Time-left info
  const { label: timeLeftLabel, isExpired, severity } = useMemo(
    () => getTimeLeftInfo(zoneInfo?.expiresAt, now),
    [zoneInfo?.expiresAt, now]
  );

  const timeLeftClass =
    severity === "danger"
      ? "text-red-300"
      : severity === "warn"
      ? "text-amber-300"
      : "text-emerald-300";

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError("");
    setUploadInfo("");

    if (!zoneInfo) {
      setUploadError("Zone information not loaded yet.");
      return;
    }

    if (isExpired) {
      setUploadError("Zone has expired. Uploads are no longer allowed.");
      return;
    }

    if (zoneInfo.uploadsLocked) {
      setUploadError("Uploads are currently locked in this zone.");
      return;
    }

    if (!selectedFiles.length) {
      setUploadError("Please select at least one file to upload.");
      return;
    }

    const tooBig = selectedFiles.some((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setUploadError(`Each file must be <= ${maxSizeMb} MB.`);
      return;
    }

    const formData = new FormData();
    formData.append("username", username);
    if (uploadMessage.trim()) {
      formData.append("message", uploadMessage.trim());
    }
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setUploading(true);
      const res = await axios.post(
        `${API_BASE}/api/zones/${zoneId}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUploadInfo(res.data.message || "Files uploaded successfully.");

      // Refresh zone (keeps userLastSeenAt in sync)
      await fetchZone();

      setSelectedFiles([]);
      setUploadMessage("");
      setFileInputKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      setUploadError(
        err.response?.data?.message ||
          "File upload failed. Check file types and size."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleToggleLock = async () => {
    if (!zoneInfo) return;
    if (!isOwner || !ownerToken) {
      return;
    }

    const newValue = !zoneInfo.uploadsLocked;

    try {
      setLockUpdating(true);
      const res = await axios.patch(
        `${API_BASE}/api/zones/${zoneId}/lock`,
        { uploadsLocked: newValue },
        {
          headers: {
            "x-owner-token": ownerToken,
          },
        }
      );

      setZoneInfo((prev) =>
        prev ? { ...prev, uploadsLocked: res.data.uploadsLocked } : prev
      );
      setUploadInfo(res.data.message || "");
    } catch (err) {
      console.error(err);
      setUploadError(
        err.response?.data?.message || "Failed to update upload lock state."
      );
    } finally {
      setLockUpdating(false);
    }
  };

  // 🧩 Extend zone time (owner, up to backend-enforced 10h total)
  const handleExtendZone = async () => {
    if (!zoneInfo) return;
    if (!isOwner || !ownerToken) return;
    if (isExpired) {
      setUploadError("Zone has already expired; cannot extend.");
      return;
    }
    if (!extendHours || extendHours < 1) return;

    try {
      setExtendLoading(true);
      const res = await axios.patch(
        `${API_BASE}/api/zones/${zoneId}/extend`,
        { extraHours: extendHours },
        {
          headers: {
            "x-owner-token": ownerToken,
          },
        }
      );

      setZoneInfo((prev) =>
        prev ? { ...prev, expiresAt: res.data.expiresAt } : prev
      );
      setUploadInfo(
        res.data.message ||
          `Zone extended by ${extendHours} hour${
            extendHours > 1 ? "s" : ""
          }.`
      );
    } catch (err) {
      console.error(err);
      setUploadError(
        err.response?.data?.message ||
          "Failed to extend zone. It may have reached its 10-hour limit."
      );
    } finally {
      setExtendLoading(false);
    }
  };

  // 🧨 Kick user (owner only)
  const handleKickUser = async (targetUsername) => {
    if (!isOwner || !ownerToken) return;
    if (!targetUsername || targetUsername === username) return;

    const ok = window.confirm(
      `Remove user "${targetUsername}" from this zone?`
    );
    if (!ok) return;

    try {
      setKickLoadingUser(targetUsername);
      const res = await axios.post(
        `${API_BASE}/api/zones/${zoneId}/kick-user`,
        { username: targetUsername },
        {
          headers: {
            "x-owner-token": ownerToken,
          },
        }
      );

      setUploadInfo(
        res.data.message ||
          `User "${targetUsername}" has been removed from this ShareZone.`
      );

      // Optimistic removal from local list
      setOnlineUsers((prev) => prev.filter((u) => u !== targetUsername));
    } catch (err) {
      console.error(err);
      setUploadError(
        err.response?.data?.message ||
          "Failed to remove user from this zone."
      );
    } finally {
      setKickLoadingUser(null);
    }
  };

  // 🔗 Share link
  const joinLink = useMemo(() => {
    if (!zoneInfo) return "";
    const origin = window.location.origin;
    return `${origin}/?zone=${encodeURIComponent(zoneInfo.zoneName)}`;
  }, [zoneInfo]);

  const handleCopyJoinLink = async () => {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      alert("Could not copy link. Please copy it manually:\n" + joinLink);
    }
  };

  // 🔍 Apply filters
  const filteredBatches = useMemo(() => {
    if (!batches.length) return [];

    const refTime = zoneInfo?.userLastSeenAt
      ? new Date(zoneInfo.userLastSeenAt)
      : new Date(pageEnteredAt);

    // Time-of-day threshold in minutes from midnight
    let fromMinutes = null;
    if (filterSinceHour.trim() !== "" && filterSinceMinute.trim() !== "") {
      const h12 = parseInt(filterSinceHour, 10);
      const m = parseInt(filterSinceMinute, 10);

      if (
        !isNaN(h12) &&
        h12 >= 1 &&
        h12 <= 12 &&
        !isNaN(m) &&
        m >= 0 &&
        m <= 59
      ) {
        let h24 = h12 % 12; // 12 => 0, 1–11 => same
        if (filterSinceAmPm === "pm") {
          h24 += 12;
        }
        fromMinutes = h24 * 60 + m;
      }
    }

    const usernameFilter = filterUsername.trim().toLowerCase();

    return batches
      .map((batch) => {
        const batchDate = new Date(batch.createdAt);

        // New-only filter
        if (filterNewOnly && batchDate <= refTime) return null;

        // "Uploaded since (time)" – compare time-of-day only
        if (fromMinutes !== null) {
          const batchMinutes =
            batchDate.getHours() * 60 + batchDate.getMinutes();
          if (batchMinutes < fromMinutes) return null;
        }

        // Username filter
        if (
          usernameFilter &&
          !batch.uploaderUsername.toLowerCase().includes(usernameFilter)
        ) {
          return null;
        }

        // File type filter
        let files = batch.files || [];
        if (filterType !== "all") {
          files = files.filter((f) => {
            const label = fileTypeLabel(f.mimeType);
            return label === filterType;
          });
        }

        if (!files.length) return null;

        return { ...batch, files };
      })
      .filter(Boolean);
  }, [
    batches,
    zoneInfo?.userLastSeenAt,
    pageEnteredAt,
    filterUsername,
    filterType,
    filterNewOnly,
    filterSinceHour,
    filterSinceMinute,
    filterSinceAmPm,
  ]);

  const handleClearFilters = () => {
    setFilterUsername("");
    setFilterType("all");
    setFilterNewOnly(false);
    setFilterSinceHour("");
    setFilterSinceMinute("");
    setFilterSinceAmPm("am");
  };

  // 👁️ Open preview: fetch as blob, create object URL
  const openPreview = async (file) => {
    if (isExpired) return;

    // clear previous object URL
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }

    setPreviewError("");
    setPreviewLoading(true);
    // show modal immediately with metadata
    setPreviewFile({
      ...file,
      url: null,
    });

    try {
      const url = `${API_BASE}/api/zones/${zoneId}/files/${file.id}/download?mode=inline`;
      const res = await axios.get(url, {
        responseType: "blob",
      });

      const blob = res.data;
      const contentType =
        res.headers["content-type"] ||
        file.mimeType ||
        "application/octet-stream";
      const objectUrl = URL.createObjectURL(
        new Blob([blob], { type: contentType })
      );

      setPreviewObjectUrl(objectUrl);
      setPreviewFile({
        ...file,
        mimeType: contentType,
        url: objectUrl,
      });
    } catch (err) {
      console.error(err);
      setPreviewError(
        err.response?.data?.message || "Failed to load file preview."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }
    setPreviewObjectUrl(null);
    setPreviewFile(null);
    setPreviewError("");
    setPreviewLoading(false);
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    if (previewLoading || !previewFile.url) {
      return (
        <div className="max-w-xs w-full rounded-xl border border-sz-border bg-slate-950 p-4 text-sm text-slate-100 text-center">
          <p className="mb-1">Loading preview…</p>
          <p className="text-xs text-slate-500">
            If this takes long for large files, you can close and use Download
            instead.
          </p>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="max-w-xs w-full rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
          {previewError}
        </div>
      );
    }

    const mime = previewFile.mimeType || "";
    const type = fileTypeLabel(mime);

    if (type === "image") {
      return (
        <img
          src={previewFile.url}
          alt={previewFile.originalName}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl border border-sz-border"
        />
      );
    }

    if (type === "video") {
      return (
        <video
          src={previewFile.url}
          controls
          className="max-h-[70vh] max-w-[90vw] rounded-xl border border-sz-border bg-black"
        />
      );
    }

    if (type === "pdf") {
      return (
        <iframe
          src={previewFile.url}
          title={previewFile.originalName}
          className="w-[90vw] h-[80vh] rounded-xl border border-sz-border bg-slate-950"
        />
      );
    }

    // Fallback for docx/xlsx/pptx/zip/other
    return (
      <div className="max-w-lg w-full rounded-xl border border-sz-border bg-slate-950 p-4 text-sm text-slate-100">
        <p className="font-medium mb-2">{previewFile.originalName}</p>
        <p className="text-xs text-slate-400 mb-3">
          Preview is not available for this file type in the browser. Download
          the file and open it with an appropriate application.
        </p>
        <button
          type="button"
          onClick={() => {
            const url = `${API_BASE}/api/zones/${zoneId}/files/${previewFile.id}/download`;
            window.open(url, "_blank");
          }}
          className="text-[11px] px-3 py-1.5 rounded-lg bg-sz-accent text-black font-medium hover:bg-sz-accent-soft transition"
        >
          Download file
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-sz-bg text-slate-100 flex flex-col">
      {/* Top bar */}
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
                Zone workspace • Files, sections & presence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden sm:inline">
              User:{" "}
              <span className="text-sz-accent font-medium">{username}</span>
              {isOwner && (
                <span className="ml-2 rounded-full px-2 py-0.5 bg-sz-accent/10 text-sz-accent border border-sz-accent/40">
                  Owner
                </span>
              )}
            </span>
            <button
              onClick={handleBackHome}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sz-border"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {/* Zone load state */}
          {loading ? (
            <div className="rounded-2xl border border-sz-border bg-slate-950/70 p-6 text-sm text-slate-300">
              Loading zone details...
            </div>
          ) : zoneError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
              {zoneError}
            </div>
          ) : (
            zoneInfo && (
              <>
                {/* Messages */}
                {(uploadError || uploadInfo || copiedLink) && (
                  <div className="space-y-2">
                    {uploadError && (
                      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                        {uploadError}
                      </div>
                    )}
                    {uploadInfo && (
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                        {uploadInfo}
                      </div>
                    )}
                    {copiedLink && (
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                        Join link copied! Share it along with the password.
                      </div>
                    )}
                  </div>
                )}

                {/* Overview + Upload controls */}
                <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
                  {/* Overview */}
                  <div className="rounded-2xl border border-sz-border bg-slate-950/70 p-6 shadow-sz-soft">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-semibold mb-1">
                            {zoneInfo.zoneName}
                          </h2>
                          <p className="text-sm text-slate-300">
                            Owner:{" "}
                            <span className="text-sz-accent font-medium">
                              {zoneInfo.ownerUsername}
                            </span>
                          </p>
                        </div>
                        {isOwner && joinLink && (
                          <button
                            type="button"
                            onClick={handleCopyJoinLink}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 border border-sz-border hover:bg-slate-800"
                          >
                            Copy join link
                          </button>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        Expires at:{" "}
                        <span className="font-mono">
                          {formatTime(zoneInfo.expiresAt)}
                        </span>
                      </p>
                      {timeLeftLabel && (
                        <p className={`mt-1 text-xl ${timeLeftClass}`}>
                          ● {timeLeftLabel}
                        </p>
                      )}
                      {isExpired && (
                        <p className="mt-2 text-[11px] text-red-300">
                          This zone has expired. Uploads are disabled and
                          downloads may be blocked by the server.
                        </p>
                      )}

                      {/* Extend zone controls (owner only) */}
                      {isOwner && !isExpired && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-400">Extend zone:</span>
                          <select
                            value={extendHours}
                            onChange={(e) =>
                              setExtendHours(Number(e.target.value) || 1)
                            }
                            disabled={extendLoading}
                            className="rounded-lg bg-slate-950 border border-sz-border px-2 py-1 text-xs outline-none focus:border-sz-accent"
                          >
                            {[1, 2, 3, 4, 5].map((h) => (
                              <option key={h} value={h}>
                                +{h} hour{h > 1 ? "s" : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleExtendZone}
                            disabled={extendLoading}
                            className="px-3 py-1.5 rounded-lg bg-sz-accent text-black font-medium text-[11px] hover:bg-sz-accent-soft transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {extendLoading ? "Extending..." : "Extend"}
                          </button>
                          <span className="text-[10px] text-slate-500">
                            Max lifetime per zone:{" "}
                            <span className="text-sz-accent">10 hours</span>{" "}
                          </span>
                        </div>
                      )}
                    </div>
                    <br />
                    {/* Online users */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base sm:text-lg font-semibold">
                        Users in this zone
                      </h3>
                    </div>

                    {onlineUsers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        You are the only user tracked in this session. When
                        others join from their browsers, they will appear here.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {onlineUsers.map((user) => (
                          <div key={user} className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] border ${
                                user === username
                                  ? "border-sz-accent/60 bg-sz-accent/10 text-sz-accent"
                                  : "border-sz-border bg-slate-900 text-slate-200"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {user}
                              {user === username && (
                                <span className="text-[9px] uppercase tracking-wide text-slate-400">
                                  (you)
                                </span>
                              )}
                            </span>
                            {isOwner && user !== username && (
                              <button
                                type="button"
                                onClick={() => handleKickUser(user)}
                                disabled={kickLoadingUser === user}
                                className="text-[10px] text-red-300 hover:text-red-200 disabled:opacity-60"
                              >
                                {kickLoadingUser === user
                                  ? "Kicking..."
                                  : "Kick"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload panel */}
                  <div className="rounded-2xl border border-sz-border bg-slate-950/70 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold">
                        Upload files
                      </h3>
                      <div className="flex items-center gap-2">
                        {isOwner && (
                          <button
                            disabled={lockUpdating || isExpired}
                            onClick={handleToggleLock}
                            className={`text-[11px] px-3 py-1.5 rounded-lg border transition ${
                              zoneInfo.uploadsLocked
                                ? "bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20"
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {lockUpdating
                              ? "Updating..."
                              : zoneInfo.uploadsLocked
                              ? "Unlock uploads"
                              : "Lock uploads"}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">
                      Max size per file:{" "}
                      <span className="text-sz-accent font-medium">
                        {maxSizeMb} MB
                      </span>
                      , {allowedTypes}.
                      <br />
                      {isExpired ? (
                        <span className="text-red-300">
                          Zone expired – uploads are disabled.
                        </span>
                      ) : zoneInfo.uploadsLocked ? (
                        <span className="text-red-300">
                          Uploads are currently locked by Admin: (
                          {zoneInfo.ownerUsername})
                          <br />
                          <span className="text-yellow-200">
                            Downloads remain allowed.
                          </span>
                        </span>
                      ) : (
                        <span className="text-emerald-300">
                          Uploads are currently enabled.
                        </span>
                      )}
                    </p>

                    <form onSubmit={handleUploadSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Choose files
                        </label>
                        <input
                          key={fileInputKey}
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          disabled={
                            zoneInfo.uploadsLocked || uploading || isExpired
                          }
                          className="block w-full text-xs text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sz-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-sz-accent-soft disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {selectedFiles.length > 0 && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Selected {selectedFiles.length} file
                            {selectedFiles.length > 1 ? "s" : ""} •{" "}
                            {formatFileSize(
                              selectedFiles.reduce(
                                (sum, f) => sum + f.size,
                                0
                              )
                            )}{" "}
                            total
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Message (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={uploadMessage}
                          onChange={(e) => setUploadMessage(e.target.value)}
                          placeholder="e.g. 'Slides for today's meeting' or 'Images for 6 PM section.'"
                          className="w-full rounded-lg bg-slate-950 border border-sz-border px-3 py-2 text-xs outline-none focus:border-sz-accent resize-none"
                          disabled={
                            zoneInfo.uploadsLocked || uploading || isExpired
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="submit"
                          disabled={
                            uploading ||
                            zoneInfo.uploadsLocked ||
                            !selectedFiles.length ||
                            isExpired
                          }
                          className="inline-flex items-center justify-center rounded-lg bg-sz-accent text-black font-medium text-sm px-4 py-2.5 hover:bg-sz-accent-soft transition shadow-sz-soft disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {uploading ? "Uploading..." : "Upload"}
                        </button>
                      </div>
                    </form>
                  </div>
                </section>

                {/* Filters */}
                <section className="mt-4 rounded-2xl border border-sz-border bg-slate-950/70 p-5">
                  <div className="flex flex-wrap items-center gap-2 justify-between mb-3">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Filters
                    </h3>
                    <div className="flex items-center gap-2 mt-1 md:mt-0">
                      <input
                        id="filter-new-only"
                        type="checkbox"
                        checked={filterNewOnly}
                        onChange={(e) => setFilterNewOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-sz-border bg-slate-950 text-sz-accent focus:ring-sz-accent"
                      />
                      <label
                        htmlFor="filter-new-only"
                        className="text-xs text-slate-300"
                      >
                        Show only{" "}
                        <span className="text-sz-accent">
                          new since last visit
                        </span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sz-border text-slate-200"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={filterUsername}
                        onChange={(e) => setFilterUsername(e.target.value)}
                        placeholder="Filter by uploader"
                        className="w-full rounded-lg bg-slate-950 border border-sz-border px-3 py-2 text-xs outline-none focus:border-sz-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        File type
                      </label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 border border-sz-border px-3 py-2 text-xs outline-none focus:border-sz-accent"
                      >
                        <option value="all">All types</option>
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                        <option value="xlsx">XLSX</option>
                        <option value="pptx">PPTX</option>
                        <option value="zip">ZIP</option>
                        <option value="file">Others</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Uploaded since (time)
                      </label>
                      <div className="grid grid-cols-[1.1fr_1.1fr_0.9fr] gap-2">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          placeholder="HH"
                          value={filterSinceHour}
                          onChange={(e) => setFilterSinceHour(e.target.value)}
                          className="w-full rounded-lg bg-slate-950 border border-sz-border px-2 py-2 text-xs outline-none focus:border-sz-accent"
                        />
                        <input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="MM"
                          value={filterSinceMinute}
                          onChange={(e) =>
                            setFilterSinceMinute(e.target.value)
                          }
                          className="w-full rounded-lg bg-slate-950 border border-sz-border px-2 py-2 text-xs outline-none focus:border-sz-accent"
                        />
                        <select
                          value={filterSinceAmPm}
                          onChange={(e) => setFilterSinceAmPm(e.target.value)}
                          className="w-full rounded-lg bg-slate-950 border border-sz-border px-2 py-2 text-xs outline-none focus:border-sz-accent"
                        >
                          <option value="am">am</option>
                          <option value="pm">pm</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Sections: upload batches */}
                <section className="mt-4 rounded-2xl border border-sz-border bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Upload activity
                    </h3>
                  </div>

                  {filteredBatches.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-sz-border/80 bg-slate-950/80 px-4 py-6 text-center text-sm text-slate-300">
                      No uploads match the selected filters.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {[...filteredBatches]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        )
                        .map((batch) => {
                          const refTime = zoneInfo.userLastSeenAt
                            ? new Date(zoneInfo.userLastSeenAt)
                            : new Date(pageEnteredAt);
                          const isNewBatch = new Date(batch.createdAt) > refTime;

                          return (
                            <div
                              key={batch.id}
                              className="rounded-xl border border-sz-border bg-slate-900/70 px-4 py-3"
                            >
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">
                                      {batch.uploaderUsername}
                                    </div>
                                    {isNewBatch && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sz-accent/10 text-sz-accent border border-sz-accent/40">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {formatTime(batch.createdAt)}
                                  </div>
                                  {batch.message && (
                                    <p className="mt-1 text-[11px] text-slate-300 break-all">
                                      <span className="text-slate-400">
                                        Message:{" "}
                                      </span>
                                      <span>{batch.message}</span>
                                    </p>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 shrink-0">
                                  {batch.files.length} file
                                  {batch.files.length !== 1 ? "s" : ""}
                                </span>
                              </div>

                              <div className="space-y-1">
                                {batch.files.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-slate-950/80 px-3 py-2 text-xs"
                                  >
                                    <div className="flex items-start gap-2 min-w-0">
                                      <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] uppercase text-slate-300">
                                        {fileTypeLabel(file.mimeType)}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="text-slate-100 break-all sm:truncate">
                                          {file.originalName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 break-words">
                                          {formatFileSize(file.sizeBytes)} •{" "}
                                          {file.mimeType}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        disabled={isExpired}
                                        onClick={() => openPreview(file)}
                                        className={`text-[11px] px-3 py-1.5 rounded-lg border border-sz-border text-slate-100 ${
                                          isExpired
                                            ? "bg-slate-800 opacity-40 cursor-not-allowed"
                                            : "bg-slate-800 hover:bg-slate-700"
                                        }`}
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isExpired}
                                        onClick={() => {
                                          if (isExpired) return;
                                          const url = `${API_BASE}/api/zones/${zoneId}/files/${file.id}/download`;
                                          window.open(url, "_blank");
                                        }}
                                        className={`text-[11px] px-3 py-1.5 rounded-lg border border-sz-border text-slate-100 ${
                                          isExpired
                                            ? "bg-slate-800 opacity-40 cursor-not-allowed"
                                            : "bg-slate-800 hover:bg-slate-700"
                                        }`}
                                      >
                                        {isExpired ? "Expired" : "Download"}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </section>
              </>
            )
          )}
        </div>
      </main>

      {/* 👁️ Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closePreview} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="flex justify-between items-center w-full max-w-[90vw] mb-1">
              <div className="text-xs text-slate-300 truncate pr-4">
                {previewFile.originalName}{" "}
                <span className="text-slate-500">
                  • {formatFileSize(previewFile.sizeBytes)} •{" "}
                  {previewFile.mimeType}
                </span>
              </div>
              <button
                onClick={closePreview}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 text-slate-100 border border-sz-border hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {renderPreviewContent()}
          </div>
        </div>
      )}
    </div>
  );
}
