// models/File.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UploadBatch",
      required: true,
    },

    // Original filename from the user
    originalName: {
      type: String,
      required: true,
    },

    // (Optional) leftover from disk-based storage. We'll still fill it,
    // but we no longer rely on local filesystem for serving or cleanup.
    storedName: {
      type: String,
    },

    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },

    uploadedBy: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    // 🌥️ Cloudinary integration
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinarySecureUrl: {
      type: String,
      required: true,
    },
    cloudinaryResourceType: {
      type: String, // "image", "video", or "raw"
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const File = mongoose.model("File", fileSchema);
