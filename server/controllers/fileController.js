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

// Allowed mime types
const ALLOWED_MIME_TYPES = [
  "application/pdf",

  "image/jpeg",
  "image/png",
  "image/gif",

  "video/mp4",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        // xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",// pptx

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

// Decide which Cloudinary resource_type to use
function getCloudinaryResourceType(mime) {
  if (!mime) return "raw";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  // pdf, docx, xlsx, pptx, zip, etc.
  return "raw";
}

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
      const resourceType = getCloudinaryResourceType(f.mimetype);

      // Upload to Cloudinary from the temp file path.
      const result = await cloudinary.uploader.upload(f.path, {
        folder: `sharezone/${zone._id}`,
        resource_type: resourceType,
        // keep original extension
        use_filename: false,
        unique_filename: true,
      });

      // Create DB record pointing to Cloudinary
      const fileDoc = await File.create({
        zone: zone._id,
        batch: batch._id,
        originalName: f.originalname,
        storedName: f.filename, // legacy, not used for serving anymore
        mimeType: f.mimetype,
        sizeBytes: f.size,
        uploadedBy: username,
        cloudinaryPublicId: result.public_id,
        cloudinaryUrl: result.secure_url || result.url,
        cloudinarySecureUrl: result.secure_url || result.url,
        cloudinaryResourceType: result.resource_type || resourceType,
      });

      fileDocs.push(fileDoc);

      // Clean up temp file
      try {
        await fsPromises.unlink(f.path);
      } catch (err) {
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
      globalThis.io.to(`zone:${zone._id}`).emit("zone_upload_batch", batchPayload);
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
    const { mode } = req.query; // mode=inline for preview, else attachment

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

    // If we have Cloudinary info, use that
    if (fileDoc.cloudinaryPublicId) {
      const resourceType = fileDoc.cloudinaryResourceType || "raw";

      // For preview (mode=inline) we don't force attachment
      const urlOptions =
        mode === "inline"
          ? {
              resource_type: resourceType,
              type: "upload",
              secure: true,
            }
          : {
              resource_type: resourceType,
              type: "upload",
              secure: true,
              flags: "attachment",
              filename_override: fileDoc.originalName,
            };

      const downloadUrl = cloudinary.url(
        fileDoc.cloudinaryPublicId,
        urlOptions
      );

      return res.redirect(downloadUrl);
    }

    // Fallback: legacy local file (very unlikely now)
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
