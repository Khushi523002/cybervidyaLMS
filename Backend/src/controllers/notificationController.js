import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

async function serializeNotification(notification) {
  const raw = typeof notification.toObject === "function" ? notification.toObject() : notification;
  const actor = raw.actorUserId ? await User.findOne({ id: raw.actorUserId }).lean() : null;
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    notification_type: raw.notificationType,
    is_read: raw.isRead,
    actor_name: actor?.name || "System",
    created_at: raw.createdAt,
  };
}

export const listNotifications = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id };
  if (req.query.unread_only === "true") filter.isRead = false;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 });
  res.json({ data: await Promise.all(notifications.map(serializeNotification)) });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ id: Number(req.params.id), userId: req.user.id });
  if (!notification) throw new HttpError(404, "Notification not found.");
  notification.isRead = true;
  await notification.save();
  res.json({ message: "Notification marked as read.", data: await serializeNotification(notification) });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id }, { isRead: true });
  res.json({ message: "All notifications marked as read." });
});
