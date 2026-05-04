import { User } from "../models/User.js";
import { HttpError } from "../utils/httpError.js";
import { verifyToken } from "../utils/token.js";

export function requireAuth(roles = []) {
  return async (req, _res, next) => {
    try {
      const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
      const payload = verifyToken(token);
      if (!payload?.userId) throw new HttpError(401, "Authentication required.");

      const user = await User.findOne({ id: payload.userId });
      if (!user) throw new HttpError(401, "Authentication required.");
      if (roles.length && !roles.includes(user.role)) {
        throw new HttpError(403, "You do not have permission for this action.");
      }

      req.user = user;
      req.tokenPayload = payload;
      next();
    } catch (error) {
      next(error);
    }
  };
}
