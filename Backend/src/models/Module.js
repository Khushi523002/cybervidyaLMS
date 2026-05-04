import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    concept: { type: String, default: "Theory" },
    subtopics: { type: [String], default: [] },
    chapters: { type: [mongoose.Schema.Types.Mixed], default: [] },
    refs: { type: [String], default: [] },
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema(
  {
    moduleId: { type: String, unique: true, index: true, required: true },
    label: { type: String, required: true },
    uploadedByUserId: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
    topics: { type: [topicSchema], default: [] },
  },
  { timestamps: true, id: false }
);

export const Module = mongoose.model("Module", moduleSchema);
