import mongoose from "mongoose";

/**
 * ModuleUnlock — tracks module unlock requests and status per intern.
 * Module 0 is always unlocked. Each subsequent module requires manager approval.
 */
const moduleUnlockSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    internUserId: { type: Number, required: true, index: true },
    moduleId: { type: String, required: true },
    moduleIndex: { type: Number, required: true }, // 0-based order

    status: {
      type: String,
      enum: ["unlocked", "pending", "locked"],
      default: "locked",
    },

    requestedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedByUserId: { type: Number, default: null },
  },
  { timestamps: true, id: false }
);

moduleUnlockSchema.index({ internUserId: 1, moduleId: 1 }, { unique: true });

export const ModuleUnlock = mongoose.model("ModuleUnlock", moduleUnlockSchema);
