import mongoose from "mongoose";

const topicPocFileSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    internUserId: { type: Number, required: true, index: true },
    moduleId: { type: String, required: true },
    topicId: { type: String, required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String },
    sizeBytes: { type: Number },
  },
  { timestamps: true, id: false }
);

topicPocFileSchema.index({ internUserId: 1, moduleId: 1, topicId: 1 });

export const TopicPocFile = mongoose.model("TopicPocFile", topicPocFileSchema);
