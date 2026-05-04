import { Router } from "express";

import { ROLES, STAFF_ROLES } from "../constants/roles.js";
import {
  changePassword,
  deleteUser,
  getProfile,
  getUserProfile,
  login,
  logout,
  updateProfile,
  updateUserProfile,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/auth.js";

export const authRouter = Router();

authRouter.post("/login/", login);
authRouter.post("/logout/", requireAuth(), logout);

// Own profile
authRouter.get("/profile/", requireAuth(), getProfile);
authRouter.put("/profile/", requireAuth(), updateProfile);
authRouter.post("/change-password/", requireAuth(), changePassword);

// Other users' profiles (staff only)
authRouter.get("/users/:id/profile/", requireAuth(STAFF_ROLES), getUserProfile);
authRouter.put("/users/:id/profile/", requireAuth(STAFF_ROLES), updateUserProfile);
authRouter.delete("/users/:id/", requireAuth(STAFF_ROLES), deleteUser);
