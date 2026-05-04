import { Router } from "express";

import { ROLES, STAFF_ROLES } from "../constants/roles.js";
import { createApproval, listApprovals, reviewApproval } from "../controllers/approvalController.js";
import { requireAuth } from "../middlewares/auth.js";

export const approvalRouter = Router();

approvalRouter.get("/", requireAuth(), listApprovals);
approvalRouter.post("/", requireAuth([ROLES.INTERN]), createApproval);
approvalRouter.post("/:id/review/", requireAuth(STAFF_ROLES), reviewApproval);
