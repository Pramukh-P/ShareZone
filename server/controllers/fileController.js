import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Zone } from "../models/Zone.js";
import { UploadBatch } from "../models/UploadBatch.js";
import { File } from "../models/File.js";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
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
      return res.status(403).json({ message: "Uploads are locked in this zone" });
    }

    const batch = await UploadBatch.create({
      zone: zone._id,
      uploaderUsername: username,
      message: message && message.trim() ? message.trim() : undefined,
    });

    const fileDocs = await Promise.all(
      files.map((f) =>
        File.create({
          zone: zone._id,
          batch: batch._id,
          originalName: f.originalname,
          storedName: f.filename,
          mimeType: f.mimetype,
          sizeBytes: f.size,
          uploadedBy: username,
        })
      )
    );

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const filePath = path.join(uploadsDir, fileDoc.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File no longer exists on server" });
    }

    return res.download(filePath, fileDoc.originalName);
  } catch (err) {
    console.error("Error downloading file:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
