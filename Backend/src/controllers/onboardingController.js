import { ROLES } from "../constants/roles.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { nextNumericId } from "../utils/ids.js";
import { hashPassword } from "../utils/password.js";
import { publicUser } from "../utils/serializers.js";

const clean = (value) => String(value || "").trim();

export const createIntern = asyncHandler(async (req, res) => {
  for (const field of ["intern_id", "name", "email", "password"]) {
    if (!clean(req.body[field])) throw new HttpError(400, `${field} is required.`);
  }

  const email = clean(req.body.email).toLowerCase();
  const exists = await User.exists({ email });
  if (exists) throw new HttpError(409, "A user with this email already exists.");

  const intern = await User.create({
    id: await nextNumericId(User),
    role: ROLES.INTERN,
    internId: clean(req.body.intern_id),
    name: clean(req.body.name),
    email,
    passwordHash: hashPassword(req.body.password),
    education: clean(req.body.education),
    certification: clean(req.body.certification),
    contactNo: clean(req.body.contact_no),
  });

  await createNotification({
    userId: intern.id,
    actorUserId: req.user.id,
    title: "Intern account created",
    message: `${req.user.name} created your Cyber Vidya intern account.`,
    notificationType: "onboarding",
  });

  res.status(201).json({ message: "Intern onboarded.", data: publicUser(intern) });
});
