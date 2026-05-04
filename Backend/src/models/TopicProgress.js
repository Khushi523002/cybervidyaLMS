import mongoose from "mongoose";

/**
 * TopicProgress — one document per intern × module × topic.
 * Tracks whether theory/practical has been submitted and approved.
 */
const topicProgressSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    internUserId: { type: Number, required: true, index: true },
    moduleId: { type: String, required: true },
    topicId: { type: String, required: true },

    // Submission flags (intern presses "Submit")
    theorySubmitted: { type: Boolean, default: false },
    practicalSubmitted: { type: Boolean, default: false },

    // Approval flags (manager approves)
    theoryApproved: { type: Boolean, default: false },
    practicalApproved: { type: Boolean, default: false },

    // Approval request id reference (optional, for linking)
    pendingApprovalId: { type: Number, default: null },
  },
  { timestamps: true, id: false }
);

topicProgressSchema.index({ internUserId: 1, moduleId: 1, topicId: 1 }, { unique: true });

export const TopicProgress = mongoose.model("TopicProgress", topicProgressSchema);
