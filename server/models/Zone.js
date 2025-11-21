// models/Zone.js
import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema(
  {
    zoneName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    ownerUsername: {
      type: String,
      required: true,
      trim: true,
    },
    // Secret used to prove which browser is the owner (for extend/delete/lock actions)
    ownerSecret: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // For Phase 2/3: owner can lock uploads (but downloads still allowed)
    uploadsLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

export const Zone = mongoose.model("Zone", zoneSchema);
