import { Notification } from "../models/Notification.js";
import { nextNumericId } from "../utils/ids.js";

export async function createNotification({ userId, actorUserId, title, message, notificationType }) {
  return Notification.create({
    id: await nextNumericId(Notification),
    userId,
    actorUserId,
    title,
    message,
    notificationType,
  });
}
