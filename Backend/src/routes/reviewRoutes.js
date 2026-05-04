import { Router } from "express";

import { STAFF_ROLES } from "../constants/roles.js";
import { listReviews, saveCommunicationReview, saveTechnicalReview } from "../controllers/reviewController.js";
import { requireAuth } from "../middlewares/auth.js";

export const reviewRouter = Router();

reviewRouter.get("/", requireAuth(), listReviews);
reviewRouter.post("/technical/", requireAuth(STAFF_ROLES), saveTechnicalReview);
reviewRouter.post("/communication/", requireAuth(STAFF_ROLES), saveCommunicationReview);
