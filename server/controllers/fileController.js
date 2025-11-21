// controllers/fileController.js
import fs from "fs";
import fsPromises from "fs/promises";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

import { Zone } from "../models/Zone.js";
import { UploadBatch } from "../models/UploadBatch.js";
import { File } from "../models/File.js";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Allowed mime types: PDF, images, MP4, DOCX, ZIP
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/zip",
  "application/x-zip-compressed",
];

// ---------- Path helpers ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temp folder for Multer (ephemeral on Render, which is fine)
const TEMP_UPLOAD_DIR = path.join(__dirname, "..", "uploads_temp");
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// ---------- Cloudinary config ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------- Multer setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

// middleware to handle multipart/form-data (max 10 files per upload)
export const uploadMiddleware = upload.array("files", 10);

// Helper: check if zone is expired
const isZoneExpired = (zone) => {
  return zone.expiresAt < new Date();
};

// ---------- POST /api/zones/:id/upload ----------
export const handleUploadFiles = async (req, res) => {
  try {
    const zoneId = req.params.id;
    const { username, message } = req.body;
    const files = req.files || [];

    if (!username) {
      return res.status(400).json({ message: "username is required" });
    }

    if (!zoneId) {
      return res.status(400).json({ message: "zoneId is required" });
    }

    if (!files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const zone = await Zone.findById(zoneId);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (isZoneExpired(zone)) {
      return res.status(410).json({ message: "Zone has expired" });
    }

    if (zone.uploadsLocked) {
      return res
        .status(403)
        .json({ message: "Uploads are locked in this zone" });
    }

    // Create one upload batch for this request
    const batch = await UploadBatch.create({
      zone: zone._id,
      uploaderUsername: username,
      message: message && message.trim() ? message.trim() : undefined,
    });

    const fileDocs = [];

    for (const f of files) {
      // Upload to Cloudinary from the temp file path.
      // resource_type: "auto" so Cloudinary decides (image, video, raw)
      const result = await cloudinary.uploader.upload(f.path, {
        folder: `sharezone/${zone._id}`,
        resource_type: "auto",
      });

      // Create DB record pointing to Cloudinary
      const fileDoc = await File.create({
        zone: zone._id,
        batch: batch._id,
        originalName: f.originalname,
        storedName: f.filename, // not used for serving anymore, just leftover
        mimeType: f.mimetype,
        sizeBytes: f.size,
        uploadedBy: username,
        cloudinaryPublicId: result.public_id,
        cloudinaryUrl: result.secure_url || result.url,
        cloudinarySecureUrl: result.secure_url || result.url,
        cloudinaryResourceType: result.resource_type || "raw",
      });

      fileDocs.push(fileDoc);

      // Clean up temp file
      try {
        await fsPromises.unlink(f.path);
      } catch (err) {
        // Non-fatal
        if (err.code !== "ENOENT") {
          console.error("Failed to remove temp file:", f.path, err.message);
        }
      }
    }

    // Build batch payload for clients
    const batchPayload = {
      id: batch._id,
      zoneId: zone._id,
      uploaderUsername: batch.uploaderUsername,
      createdAt: batch.createdAt,
      message: batch.message,
      files: fileDocs.map((f) => ({
        id: f._id,
        originalName: f.originalName,
        storedName: f.storedName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        uploadedAt: f.uploadedAt,
      })),
    };

    // 🔔 Broadcast to all sockets in this zone
    if (globalThis.io) {
      globalThis.io
        .to(`zone:${zone._id}`)
        .emit("zone_upload_batch", batchPayload);
    }

    return res.status(201).json({
      message: "Files uploaded successfully",
      batch: batchPayload,
      files: batchPayload.files,
    });
  } catch (err) {
    console.error("Error uploading files:", err);
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  }
};

// ---------- GET /api/zones/:zoneId/files/:fileId/download ----------
export const handleDownloadFile = async (req, res) => {
  try {
    const { zoneId, fileId } = req.params;

    const zone = await Zone.findById(zoneId);
    if (!zone || zone.isDeleted) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (zone.expiresAt < new Date()) {
      return res.status(410).json({ message: "Zone has expired" });
    }

    const fileDoc = await File.findOne({ _id: fileId, zone: zone._id });
    if (!fileDoc) {
      return res.status(404).json({ message: "File not found in this zone" });
    }

    // ✅ New: redirect to Cloudinary URL (browser will download/preview)
    if (fileDoc.cloudinarySecureUrl) {
      return res.redirect(fileDoc.cloudinarySecureUrl);
    }

    // Fallback: if any old record without Cloudinary info remains
    const localUploadsDir = path.join(__dirname, "..", "uploads");
    const filePath = path.join(localUploadsDir, fileDoc.storedName || "");
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "File no longer exists on server" });
    }

    return res.download(filePath, fileDoc.originalName);
  } catch (err) {
    console.error("Error downloading file:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
