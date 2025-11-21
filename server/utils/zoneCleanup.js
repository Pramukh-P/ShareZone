// utils/zoneCleanup.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

import { Zone } from "../models/Zone.js";
import { File } from "../models/File.js";
import { UploadBatch } from "../models/UploadBatch.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { UserSession } from "../models/UserSession.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// /utils -> /uploads (same level as utils)
// This was used when files were on disk; we keep it for safety/fallback.
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Cloudinary config (same env vars as in fileController)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Safely deletes a physical file using its storedName (legacy).
 * Ignores "file not found" errors.
 */
async function safeDeleteStoredFile(storedName) {
  if (!storedName) return;
  const fullPath = path.join(UPLOADS_DIR, storedName);
  try {
    await fs.unlink(fullPath);
    console.log("🗑️ Deleted legacy file from disk:", fullPath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(
        "❌ Failed to delete file from disk:",
        fullPath,
        err.message
      );
    }
  }
}

/**
 * Hard-delete everything related to a zone:
 * - Cloudinary assets (by cloudinaryPublicId)
 * - Physical files under /uploads (legacy)
 * - Files documents
 * - Upload batches
 * - Chat messages
 * - User sessions
 * - Zone document itself
 */
export async function cleanupZoneById(zoneId) {
  if (!zoneId) return;

  console.log("🧹 Cleaning up zone:", zoneId.toString());

  // 1. Delete Cloudinary assets + legacy disk files
  const files = await File.find({ zone: zoneId });

  for (const file of files) {
    // a) Cloudinary
    if (file.cloudinaryPublicId) {
      try {
        const resourceType = file.cloudinaryResourceType || "raw";
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
          resource_type: resourceType,
        });
        console.log(
          `🗑️ Deleted Cloudinary asset: ${file.cloudinaryPublicId} (type: ${resourceType})`
        );
      } catch (err) {
        console.error(
          "❌ Failed to delete Cloudinary asset:",
          file.cloudinaryPublicId,
          err.message
        );
      }
    }

    // b) Legacy disk file cleanup (if any remain)
    if (file.storedName) {
      await safeDeleteStoredFile(file.storedName);
    }
  }

  // 2. Delete related documents from collections (all with field "zone")
  await Promise.all([
    File.deleteMany({ zone: zoneId }),
    UploadBatch.deleteMany({ zone: zoneId }),
    ChatMessage.deleteMany({ zone: zoneId }),
    UserSession.deleteMany({ zone: zoneId }),
  ]);

  // 3. Delete the zone document itself
  await Zone.deleteOne({ _id: zoneId });

  console.log("✅ Cleanup complete for zone:", zoneId.toString());
}

/**
 * Find all zones that have expired (expiresAt < now) OR are marked isDeleted=true,
 * and perform full cleanup for each.
 */
export async function cleanupExpiredZones() {
  const now = new Date();
  console.log("⏰ Running expired zones cleanup at", now.toISOString());

  const zones = await Zone.find({
    $or: [{ expiresAt: { $lt: now } }, { isDeleted: true }],
  });

  if (!zones.length) {
    console.log("🧹 No expired/soft-deleted zones to clean up.");
    return;
  }

  console.log(`🧹 Found ${zones.length} zones to clean up.`);

  for (const zone of zones) {
    try {
      await cleanupZoneById(zone._id);
    } catch (err) {
      console.error("❌ Error cleaning zone", zone._id.toString(), err);
    }
  }
}
