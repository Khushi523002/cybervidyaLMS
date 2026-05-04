import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { ROLES, STAFF_ROLES } from "../constants/roles.js";
import {
  approveModuleUnlock,
  approveTopicSubmit,
  getModuleUnlocks,
  getMyProgress,
  requestModuleUnlock,
  submitTopicPart,
  uploadPoc,
  getPocFiles,
} from "../controllers/topicProgressController.js";
import { requireAuth } from "../middlewares/auth.js";

// Multer setup for POC uploads
const uploadDir = path.resolve("uploads/poc");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export const topicProgressRouter = Router();

// Get progress for intern (intern sees own; manager passes ?intern_user_id=)
topicProgressRouter.get("/progress/", requireAuth(), getMyProgress);

// Intern submits a topic part
topicProgressRouter.post("/progress/submit/", requireAuth([ROLES.INTERN]), submitTopicPart);

// Manager approves/rejects a topic submit
topicProgressRouter.post("/progress/approve/:approvalId/", requireAuth(STAFF_ROLES), approveTopicSubmit);

// Module unlock
topicProgressRouter.get("/unlocks/", requireAuth(), getModuleUnlocks);
topicProgressRouter.post("/unlocks/request/", requireAuth([ROLES.INTERN]), requestModuleUnlock);
topicProgressRouter.post("/unlocks/approve/:approvalId/", requireAuth(STAFF_ROLES), approveModuleUnlock);

// POC file upload (practical topics)
topicProgressRouter.post("/progress/poc/upload/", requireAuth([ROLES.INTERN]), upload.single("poc_file"), uploadPoc);
topicProgressRouter.get("/progress/poc/", requireAuth(), getPocFiles);
