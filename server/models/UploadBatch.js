// models/UploadBatch.js
import mongoose from "mongoose";

const uploadBatchSchema = new mongoose.Schema(
  {
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },
    uploaderUsername: {
      type: String,
      required: true,
      trim: true,
    },
    // ✅ Optional message attached to this upload batch
    message: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now, // used as the "section time" in UI
    },
  },
  {
    timestamps: true,
  }
);

export const UploadBatch = mongoose.model("UploadBatch", uploadBatchSchema);
