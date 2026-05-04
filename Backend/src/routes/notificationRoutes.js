import { Router } from "express";

import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";
import { requireAuth } from "../middlewares/auth.js";

export const notificationRouter = Router();

notificationRouter.get("/", requireAuth(), listNotifications);
notificationRouter.post("/read-all/", requireAuth(), markAllNotificationsRead);
notificationRouter.post("/:id/read/", requireAuth(), markNotificationRead);
