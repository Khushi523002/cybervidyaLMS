import { Router } from "express";

import { ROLES, STAFF_ROLES } from "../constants/roles.js";
import { listInterns, listManagers, overview } from "../controllers/dashboardController.js";
import { requireAuth } from "../middlewares/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/overview/", requireAuth(), overview);
dashboardRouter.get("/interns/", requireAuth(STAFF_ROLES), listInterns);
dashboardRouter.get("/managers/", requireAuth([ROLES.ADMIN]), listManagers);
