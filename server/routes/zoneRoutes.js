// routes/zoneRoutes.js
import express from "express";
import {
  createZone,
  joinZone,
  getZoneById,
  extendZone,
  deleteZone,
  setUploadsLocked,
  kickUser,          // 👈 NEW
} from "../controllers/zoneController.js";
import {
  uploadMiddleware,
  handleUploadFiles,
  handleDownloadFile,
} from "../controllers/fileController.js";
import { getZoneChat } from "../controllers/chatController.js";

const router = express.Router();

// POST /api/zones  -> create zone
router.post("/", createZone);

// POST /api/zones/join  -> join zone
router.post("/join", joinZone);

// POST /api/zones/:id/upload  -> upload files to a zone
router.post("/:id/upload", (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res
        .status(400)
        .json({ message: err.message || "File upload error" });
    }
    await handleUploadFiles(req, res);
  });
});

// GET /api/zones/:zoneId/files/:fileId/download  -> download file
router.get("/:zoneId/files/:fileId/download", downloadFile );

// GET /api/zones/:id/chat  -> chat history for this zone
router.get("/:id/chat", getZoneChat);

// GET /api/zones/:id  -> zone info + batches + files
router.get("/:id", getZoneById);

// PATCH /api/zones/:id/extend  -> extend zone expiry (owner only)
router.patch("/:id/extend", extendZone);

// PATCH /api/zones/:id/lock  -> toggle uploadsLocked (owner only)
router.patch("/:id/lock", setUploadsLocked);

// POST /api/zones/:id/kick-user  -> kick a user (owner only)
router.post("/:id/kick-user", kickUser);

// DELETE /api/zones/:id  -> delete zone (owner only)
router.delete("/:id", deleteZone);

export default router;
