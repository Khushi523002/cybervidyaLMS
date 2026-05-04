import mongoose from "mongoose";

import { ROLES } from "../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    internId: { type: String, trim: true },
    contactNo: { type: String, trim: true },
    education: { type: String, default: "" },
    certification: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    internCanEdit: { type: Boolean, default: false },
    internCanDelete: { type: Boolean, default: false },
    completedModules: { type: Number, default: 0 },
    dateJoined: { type: Date, default: Date.now },
  },
  { timestamps: true, id: false }
);

export const User = mongoose.model("User", userSchema);
