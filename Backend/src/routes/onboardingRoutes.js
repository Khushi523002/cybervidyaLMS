import { Router } from "express";

import { STAFF_ROLES } from "../constants/roles.js";
import { createIntern } from "../controllers/onboardingController.js";
import { requireAuth } from "../middlewares/auth.js";

export const onboardingRouter = Router();

onboardingRouter.post("/interns/", requireAuth(STAFF_ROLES), createIntern);
