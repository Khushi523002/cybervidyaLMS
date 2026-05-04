import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    requesterUserId: { type: Number, required: true, index: true },
    reviewerUserId: { type: Number },

    /**
     * requestType values:
     *  "edit"             — legacy: intern requesting edit permission
     *  "delete"           — legacy: intern requesting delete permission
     *  "topic_submit"     — intern submitting theory/practical for a topic
     *  "module_unlock"    — intern requesting next module to be unlocked
     *  "module_complete"  — intern submitting entire module for manager approval
     */
    requestType: {
      type: String,
      enum: ["edit", "delete", "topic_submit", "module_unlock", "module_complete"],
      default: "edit",
    },

    // Topic-level fields (used when requestType === "topic_submit")
    moduleId: { type: String, default: null },
    topicId: { type: String, default: null },
    completionType: {
      type: String,
      enum: ["theory", "practical", "both", null],
      default: null,
    },

    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNotes: { type: String, default: "" },
  },
  { timestamps: true, id: false }
);

export const Approval = mongoose.model("Approval", approvalSchema);