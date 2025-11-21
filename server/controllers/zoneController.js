import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Zone } from "../models/Zone.js";
import { UserSession } from "../models/UserSession.js";
import { UploadBatch } from "../models/UploadBatch.js";
import { File } from "../models/File.js";
import { cleanupZoneById } from "../utils/zoneCleanup.js";

const ZONE_MIN_HOURS = 1;
const ZONE_MAX_HOURS = 5;         
const ZONE_MAX_TOTAL_HOURS = 10;   

const getExpiresAt = (durationHours) => {
  const now = Date.now();
  return new Date(now + durationHours * 60 * 60 * 1000);
};

// small helper: check if zone expired
const isZoneExpired = (zone) => {
  return zone.expiresAt < new Date();
};

// ✅ POST /api/zones  -> create zone
export const createZone = async (req, res) => {
  try {
    const { zoneName, password, durationHours, username } = req.body;

    if (!zoneName || !password || !durationHours || !username) {
      return res
        .status(400)
        .json({ message: "zoneName, password, durationHours, username are required" });
    }

    if (
      typeof durationHours !== "number" ||
      durationHours < ZONE_MIN_HOURS ||
      durationHours > ZONE_MAX_HOURS
    ) {
      return res
        .status(400)
        .json({
          message: `Duration must be between ${ZONE_MIN_HOURS} and ${ZONE_MAX_HOURS} hours`,
        });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const ownerSecret = crypto.randomBytes(32).toString("hex");

    const expiresAt = getExpiresAt(durationHours);

    const zone = await Zone.create({
      zoneName,
      passwordHash,
      ownerUsername: username,
      ownerSecret,
      expiresAt,
    });

    await UserSession.create({
      zone: zone._id,
      username,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    });

    return res.status(201).json({
      message: "Zone created successfully",
      zone: {
        id: zone._id,
        zoneName: zone.zoneName,
        ownerUsername: zone.ownerUsername,
        expiresAt: zone.expiresAt,
      },
      // This token we will store in localStorage on THIS device only
      ownerToken: ownerSecret,
    });
  } catch (err) {
    console.error("Error creating zone:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ POST /api/zones/join  -> join zone by name + password + username
export const joinZone = async (req, res) => {
  try {
    const { zoneName, password, username } = req.body;

    if (!zoneName || !password || !username) {
      return res
        .status(400)
        .json({ message: "zoneName, password, username are required" });
    }

    const zone = await Zone.findOne({ zoneName, isDeleted: false }).sort({
      createdAt: -1,
    });

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    // check expiry
    if (isZoneExpired(zone)) {
      return res.status(410).json({ message: "Zone has expired" });
    }

    // check password
    const ok = await bcrypt.compare(password, zone.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Check if user is already kicked from this zone
    let session = await UserSession.findOne({
      zone: zone._id,
      username,
    });

    if (session && session.isKicked) {
      return res
        .status(403)
        .json({ message: "You have been removed from this zone by the owner." });
    }

    if (!session) {
      session = await UserSession.create({
        zone: zone._id,
        username,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
      });
    } else {
      session.lastSeenAt = new Date();
      await session.save();
    }

    return res.json({
      message: "Joined zone successfully",
      zone: {
        id: zone._id,
        zoneName: zone.zoneName,
        ownerUsername: zone.ownerUsername,
        expiresAt: zone.expiresAt,
        uploadsLocked: zone.uploadsLocked,
      },
      user: {
        username: session.username,
        joinedAt: session.joinedAt,
      },
    });
  } catch (err) {
    console.error("Error joining zone:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ GET /api/zones/:id  -> zone info + upload batches + files (+ userLastSeenAt)
export const getZoneById = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.query;

    const zone = await Zone.findById(id);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (zone.expiresAt < new Date()) {
      return res.status(410).json({ message: "Zone has expired" });
    }

    // 🚫 Block kicked users even if they try to open from Joined Zones
    let userLastSeenAt = null;
    if (username) {
      const session = await UserSession.findOne({
        zone: zone._id,
        username,
      });

      if (session && session.isKicked) {
        return res.status(403).json({
          message: "You have been removed from this zone by the owner.",
        });
      }

      if (session) {
        userLastSeenAt = session.lastSeenAt || session.joinedAt;
        session.lastSeenAt = new Date();
        await session.save();
      }
    }

    // Fetch all batches for this zone
    const batches = await UploadBatch.find({ zone: zone._id })
      .sort({ createdAt: 1 })
      .lean();

    const batchIds = batches.map((b) => b._id);
    let files = [];
    if (batchIds.length > 0) {
      files = await File.find({ batch: { $in: batchIds } }).lean();
    }

    const batchesWithFiles = batches.map((b) => ({
  id: b._id,
  uploaderUsername: b.uploaderUsername,
  createdAt: b.createdAt,
  message: b.message,
  files: files
    .filter((f) => String(f.batch) === String(b._id))
    .map((f) => ({
      id: f._id,
      originalName: f.originalName,
      storedName: f.storedName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      uploadedAt: f.uploadedAt,

      // 🔹 New fields: use Cloudinary URL directly on frontend
      cloudinaryUrl: f.cloudinarySecureUrl || f.cloudinaryUrl,
      cloudinaryResourceType: f.cloudinaryResourceType,
    })),
}));


    return res.json({
      id: zone._id,
      zoneName: zone.zoneName,
      ownerUsername: zone.ownerUsername,
      expiresAt: zone.expiresAt,
      uploadsLocked: zone.uploadsLocked,
      userLastSeenAt, // 👈 used by frontend for NEW marker
      batches: batchesWithFiles,
    });
  } catch (err) {
    console.error("Error getting zone:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// Helper: verify owner using ownerToken header
const verifyOwner = (zone, ownerToken) => {
  if (!ownerToken) return false;
  return zone.ownerSecret === ownerToken;
};

// ✅ PATCH /api/zones/:id/extend  -> extend zone expiry (owner only)
export const extendZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { extraHours } = req.body;
    const ownerToken = req.headers["x-owner-token"];

    if (!extraHours || typeof extraHours !== "number") {
      return res
        .status(400)
        .json({ message: "extraHours (number) is required" });
    }

    if (extraHours < 1 || extraHours > 5) {
      return res
        .status(400)
        .json({ message: "extraHours must be between 1 and 5" });
    }

    const zone = await Zone.findById(id);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (!verifyOwner(zone, ownerToken)) {
      return res.status(403).json({ message: "Not authorized (owner only)" });
    }

    if (isZoneExpired(zone)) {
      return res.status(410).json({ message: "Zone has already expired" });
    }

    // 🔒 Enforce max TOTAL lifetime of 10 hours from createdAt
    const MAX_TOTAL_MS = ZONE_MAX_TOTAL_HOURS * 60 * 60 * 1000;
    const createdMs = zone.createdAt.getTime();
    const currentExpiryMs = zone.expiresAt.getTime();
    const currentLifetimeMs = currentExpiryMs - createdMs;

    const requestedExtraMs = extraHours * 60 * 60 * 1000;
    const newTotalMs = currentLifetimeMs + requestedExtraMs;

    if (newTotalMs > MAX_TOTAL_MS) {
      const remainingMs = MAX_TOTAL_MS - currentLifetimeMs;
      const remainingHours = remainingMs / (60 * 60 * 1000);

      if (remainingHours <= 0) {
        return res.status(400).json({
          message:
            "This zone has already reached its maximum lifetime of 10 hours and cannot be extended further.",
        });
      }

      // You can show how much is left
      const rounded = Math.floor(remainingHours * 10) / 10; // 1 decimal
      return res.status(400).json({
        message: `You can only extend this zone by up to ${rounded} more hour(s) (maximum total 10 hours).`,
      });
    }

    // extend expiry
    const newExpiresAt = new Date(currentExpiryMs + requestedExtraMs);
    zone.expiresAt = newExpiresAt;
    await zone.save();

    // 🔔 Broadcast new expiry to zone
    if (globalThis.io) {
      globalThis.io.to(`zone:${zone._id}`).emit("zone_extended", {
        zoneId: String(zone._id),
        expiresAt: zone.expiresAt,
        extraHours,
        extendedBy: zone.ownerUsername,
      });
    }

    return res.json({
      message: "Zone expiry extended",
      expiresAt: zone.expiresAt,
    });
  } catch (err) {
    console.error("Error extending zone:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ PATCH /api/zones/:id/lock  -> toggle uploadsLocked (owner only)
export const setUploadsLocked = async (req, res) => {
  try {
    const { id } = req.params;
    const { uploadsLocked } = req.body;
    const ownerToken = req.headers["x-owner-token"];

    if (typeof uploadsLocked !== "boolean") {
      return res
        .status(400)
        .json({ message: "uploadsLocked (boolean) is required" });
    }

    const zone = await Zone.findById(id);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (!verifyOwner(zone, ownerToken)) {
      return res.status(403).json({ message: "Not authorized (owner only)" });
    }

    if (zone.expiresAt < new Date()) {
      return res.status(410).json({ message: "Zone has already expired" });
    }

    zone.uploadsLocked = uploadsLocked;
    await zone.save();

    // 🔔 Broadcast lock state to zone
    if (globalThis.io) {
      globalThis.io.to(`zone:${zone._id}`).emit("zone_lock_state", {
        zoneId: String(zone._id),
        uploadsLocked: zone.uploadsLocked,
        updatedBy: zone.ownerUsername,
      });
    }

    return res.json({
      message: uploadsLocked ? "Uploads locked" : "Uploads unlocked",
      uploadsLocked: zone.uploadsLocked,
    });
  } catch (err) {
    console.error("Error updating uploadsLocked:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ POST /api/zones/:id/kick-user  -> owner kicks a specific user
export const kickUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username: targetUsername } = req.body;
    const ownerToken = req.headers["x-owner-token"];

    if (!targetUsername) {
      return res
        .status(400)
        .json({ message: "username (user to kick) is required" });
    }

    const zone = await Zone.findById(id);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (!verifyOwner(zone, ownerToken)) {
      return res.status(403).json({ message: "Not authorized (owner only)" });
    }

    // Owner cannot kick themselves (just in case)
    if (targetUsername === zone.ownerUsername) {
      return res.status(400).json({ message: "Owner cannot be kicked." });
    }

    const session = await UserSession.findOne({
      zone: zone._id,
      username: targetUsername,
    });

    if (!session) {
      return res
        .status(404)
        .json({ message: "User session not found in this zone." });
    }

    session.isKicked = true;
    await session.save();

    // 🔔 Notify all clients in this zone
    if (globalThis.io) {
      globalThis.io.to(`zone:${zone._id}`).emit("user_kicked", {
        zoneId: String(zone._id),
        username: targetUsername,
      });
    }

    return res.json({
      message: `User "${targetUsername}" has been removed from this zone.`,
    });
  } catch (err) {
    console.error("Error kicking user:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ DELETE /api/zones/:id  -> delete zone completely (owner only)
export const deleteZone = async (req, res) => {
  try {
    const zoneId = req.params.id;
    const ownerToken = req.header("x-owner-token");

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (!verifyOwner(zone, ownerToken)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this zone" });
    }

    // HARD CLEANUP: zone + all related docs + physical files
    await cleanupZoneById(zone._id);

    return res.json({ message: "Zone deleted successfully" });
  } catch (err) {
    console.error("Error deleting zone:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
