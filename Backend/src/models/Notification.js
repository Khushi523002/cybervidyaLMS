import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    userId: { type: Number, required: true, index: true },
    actorUserId: { type: Number },
    title: { type: String, required: true },
    message: { type: String, required: true },
    notificationType: { type: String, default: "system" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, id: false }
);

export const Notification = mongoose.model("Notification", notificationSchema);
