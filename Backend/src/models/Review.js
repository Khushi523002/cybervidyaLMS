import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    internUserId: { type: Number, required: true, index: true },
    managerUserId: { type: Number, required: true, index: true },

    moduleId: { type: String, default: null },
    topicId: { type: String, default: null },

    technicalRating: { type: Number, default: 0 },
    technicalComment: { type: String, default: "" },
    communicationRating: { type: Number, default: 0 },
    communicationComment: { type: String, default: "" },
  },
  { timestamps: true, id: false }
);

// Simple indexes only — NO unique compound index, managers can give unlimited reviews
reviewSchema.index({ internUserId: 1 });
reviewSchema.index({ managerUserId: 1 });

export const Review = mongoose.model("Review", reviewSchema);