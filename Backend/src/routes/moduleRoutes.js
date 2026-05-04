import { Router } from "express";
import multer from "multer";

import { STAFF_ROLES } from "../constants/roles.js";
import { deleteModule, listModules, uploadModules } from "../controllers/moduleController.js";
import { requireAuth } from "../middlewares/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const moduleRouter = Router();

moduleRouter.get("/", requireAuth(), listModules);
moduleRouter.post("/upload/", requireAuth(STAFF_ROLES), upload.single("file"), uploadModules);
moduleRouter.delete("/:id/", requireAuth(STAFF_ROLES), deleteModule);
