import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { publicUser, serializeIntern, serializeReview } from "../utils/serializers.js";
import { createToken } from "../utils/token.js";
import { Approval } from "../models/Approval.js";
import { Module } from "../models/Module.js";
import { Review } from "../models/Review.js";
import { TopicProgress } from "../models/TopicProgress.js";
import { TopicPocFile } from "../models/TopicPocFile.js";

export const listManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ role: { $in: ["manager", "admin"] } }).sort({ id: 1 });

  const serialized = await Promise.all(managers.map(async (manager) => {
    const raw = typeof manager.toObject === "function" ? manager.toObject() : manager;
    const [reviewsGiven, internCount, pendingApprovals] = await Promise.all([
      Review.countDocuments({ managerUserId: raw.id }),
      User.countDocuments({ role: "intern" }),
      Approval.countDocuments({ status: "pending" }),
    ]);
    return {
      id: raw.id,
      name: raw.name,
      email: raw.email,
      role: raw.role,
      is_active: raw.isActive,
      contact_no: raw.contactNo,
      date_joined: raw.dateJoined || raw.createdAt,
      reviews_given: reviewsGiven,
      total_interns: internCount,
      pending_approvals: pendingApprovals,
    };
  }));

  res.json({ data: serialized });
});


export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !verifyPassword(req.body.password || "", user.passwordHash)) {
    throw new HttpError(401, "Invalid email or password.");
  }
  const token = createToken({ userId: user.id, role: user.role });
  res.json({ message: "Logged in.", data: { token, user: publicUser(user) } });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({ message: "Logged out." });
});

export const getProfile = asyncHandler(async (req, res) => {
  if (req.user.role === "intern") {
    const [base, reviews, approvals, topicProgress, pocFiles] = await Promise.all([
      serializeIntern(req.user),
      Review.find({ internUserId: req.user.id }).sort({ updatedAt: -1 }),
      Approval.find({ requesterUserId: req.user.id }).sort({ createdAt: -1 }).lean(),
      TopicProgress.find({ internUserId: req.user.id }).lean(),
      TopicPocFile.find({ internUserId: req.user.id }).sort({ createdAt: -1 }).lean(),
    ]);
    return res.json({
      data: {
        ...base,
        reviews: await Promise.all(reviews.map(serializeReview)),
        approvals: await Promise.all(approvals.map(serializeApprovalForProfile)),
        topic_progress: topicProgress.map((p) => ({
          module_id: p.moduleId,
          topic_id: p.topicId,
          theory_submitted: p.theorySubmitted,
          practical_submitted: p.practicalSubmitted,
          theory_approved: p.theoryApproved,
          practical_approved: p.practicalApproved,
        })),
        poc_files: pocFiles.map((f) => ({
          id: f.id,
          module_id: f.moduleId,
          topic_id: f.topicId,
          original_name: f.originalName,
          stored_name: f.storedName,
          mime_type: f.mimeType,
          size_bytes: f.sizeBytes,
          uploaded_at: f.createdAt,
        })),
      },
    });
  }

  // Manager / admin: include dashboard stats
  if (req.user.role === "manager" || req.user.role === "admin") {
    const [totalInterns, pendingApprovals, approvedApprovals, totalModules] = await Promise.all([
      User.countDocuments({ role: "intern" }),
      Approval.countDocuments({ status: "pending" }),
      Approval.countDocuments({ status: "approved" }),
      Module.countDocuments(),
    ]);
    return res.json({
      data: {
        ...publicUser(req.user),
        profile_stats: {
          total_approved: approvedApprovals,
          pending_approvals: pendingApprovals,
          total_interns: totalInterns,
          total_modules: totalModules,
        },
      },
    });
  }

  res.json({ data: publicUser(req.user) });
});

async function serializeApprovalForProfile(approval) {
  let moduleLabel = approval.moduleId || null;
  let topicLabel = approval.topicId || null;
  if (approval.moduleId) {
    const mod = await Module.findOne({ moduleId: approval.moduleId }).lean();
    if (mod) {
      moduleLabel = mod.label;
      if (approval.topicId) {
        const topic = (mod.topics || []).find((t) => t.id === approval.topicId);
        if (topic) topicLabel = topic.label;
      }
    }
  }
  return {
    id: approval.id,
    request_type: approval.requestType,
    module_id: approval.moduleId,
    topic_id: approval.topicId,
    module_label: moduleLabel,
    topic_label: topicLabel,
    completion_type: approval.completionType,
    reason: approval.reason,
    status: approval.status,
    review_notes: approval.reviewNotes,
    created_at: approval.createdAt,
    updated_at: approval.updatedAt,
  };
}

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: Number(req.params.id) });
  if (!user) throw new HttpError(404, "User not found.");

  if (user.role !== "intern") {
    return res.json({ data: publicUser(user) });
  }

  const [base, reviews, approvals, topicProgress, pocFiles] = await Promise.all([
    serializeIntern(user),
    Review.find({ internUserId: user.id }).sort({ updatedAt: -1 }),
    Approval.find({ requesterUserId: user.id }).sort({ createdAt: -1 }).lean(),
    TopicProgress.find({ internUserId: user.id }).lean(),
    TopicPocFile.find({ internUserId: user.id }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    data: {
      ...base,
      reviews: await Promise.all(reviews.map(serializeReview)),
      approvals: await Promise.all(approvals.map(serializeApprovalForProfile)),
      topic_progress: topicProgress.map((p) => ({
        module_id: p.moduleId,
        topic_id: p.topicId,
        theory_submitted: p.theorySubmitted,
        practical_submitted: p.practicalSubmitted,
        theory_approved: p.theoryApproved,
        practical_approved: p.practicalApproved,
      })),
      poc_files: pocFiles.map((f) => ({
        id: f.id,
        module_id: f.moduleId,
        topic_id: f.topicId,
        original_name: f.originalName,
        stored_name: f.storedName,
        mime_type: f.mimeType,
        size_bytes: f.sizeBytes,
        uploaded_at: f.createdAt,
      })),
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const allowed = ["name", "contactNo", "education", "certification"];
  for (const field of allowed) {
    const bodyKey = field === "contactNo" ? "contact_no" : field;
    if (req.body[bodyKey] !== undefined) {
      user[field] = String(req.body[bodyKey] || "").trim();
    }
  }
  await user.save();
  res.json({ message: "Profile updated.", data: publicUser(user) });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const targetUser = await User.findOne({ id: Number(req.params.id) });
  if (!targetUser) throw new HttpError(404, "User not found.");

  const allowed = ["name", "contactNo", "education", "certification", "isActive"];
  for (const field of allowed) {
    const bodyKey =
      field === "contactNo" ? "contact_no" :
      field === "isActive" ? "is_active" :
      field;
    if (req.body[bodyKey] !== undefined) {
      if (field === "isActive") targetUser[field] = Boolean(req.body[bodyKey]);
      else targetUser[field] = String(req.body[bodyKey] || "").trim();
    }
  }
  await targetUser.save();
  res.json({ message: "Profile updated.", data: publicUser(targetUser) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findOne({ id: Number(req.params.id) });
  if (!targetUser) throw new HttpError(404, "User not found.");
  if (targetUser.id === req.user.id) throw new HttpError(400, "You cannot delete yourself.");
  await User.deleteOne({ id: targetUser.id });
  res.json({ message: "User deleted." });
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!verifyPassword(req.body.current_password || "", req.user.passwordHash)) {
    throw new HttpError(400, "Current password is incorrect.");
  }
  req.user.passwordHash = hashPassword(req.body.new_password || "");
  await req.user.save();
  res.json({ message: "Password changed. Please sign in again." });
});