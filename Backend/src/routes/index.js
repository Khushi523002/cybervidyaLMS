import { Router } from "express";

import { approvalRouter } from "./approvalRoutes.js";
import { authRouter } from "./authRoutes.js";
import { dashboardRouter } from "./dashboardRoutes.js";
import { moduleRouter } from "./moduleRoutes.js";
import { notificationRouter } from "./notificationRoutes.js";
import { onboardingRouter } from "./onboardingRoutes.js";
import { reviewRouter } from "./reviewRoutes.js";
import { topicProgressRouter } from "./topicProgressRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/modules", moduleRouter);
apiRouter.use("/reviews", reviewRouter);
apiRouter.use("/approvals", approvalRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/onboarding", onboardingRouter);
apiRouter.use("/intern", topicProgressRouter);
