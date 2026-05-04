import { Approval } from "../models/Approval.js";
import { Module } from "../models/Module.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";

export function publicUser(user) {
  if (!user) return null;
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  const { passwordHash, __v, _id, ...safe } = raw;
  return {
    id: safe.id,
    role: safe.role,
    name: safe.name,
    email: safe.email,
    intern_id: safe.internId,
    contact_no: safe.contactNo,
    education: safe.education,
    certification: safe.certification,
    is_active: safe.isActive,
    intern_can_edit: safe.internCanEdit,
    intern_can_delete: safe.internCanDelete,
    completed_modules: safe.completedModules,
    date_joined: safe.dateJoined,
    created_at: safe.createdAt,
    updated_at: safe.updatedAt,
    password_ready: Boolean(passwordHash),
  };
}

export function serializeModule(module) {
  const raw = typeof module.toObject === "function" ? module.toObject() : module;
  return {
    id: raw.moduleId,
    label: raw.label,
    uploadedAt: raw.uploadedAt,
    meta: raw.meta,
    topics: raw.topics || [],
  };
}

export async function reviewSummary(internUserId) {
  const reviews = await Review.find({ internUserId }).lean();
  const average = (field) => {
    const values = reviews.map((review) => Number(review[field])).filter(Boolean);
    return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0;
  };
  const communication = average("communicationRating");
  const technical = average("technicalRating");
  const overallValues = [communication, technical].filter(Boolean);
  return {
    communication_rating_average: communication,
    technical_rating_average: technical,
    overall_rating_average: overallValues.length
      ? Number((overallValues.reduce((sum, value) => sum + value, 0) / overallValues.length).toFixed(1))
      : 0,
  };
}

export async function serializeReview(review) {
  const raw = typeof review.toObject === "function" ? review.toObject() : review;
  const [intern, manager] = await Promise.all([
    User.findOne({ id: raw.internUserId }).lean(),
    User.findOne({ id: raw.managerUserId }).lean(),
  ]);

  // Resolve module label and topic label
  let moduleLabel = raw.moduleId || null;
  let topicLabel = raw.topicId || null;
  if (raw.moduleId) {
    const mod = await Module.findOne({ moduleId: raw.moduleId }).lean();
    if (mod) {
      moduleLabel = mod.label;
      if (raw.topicId) {
        const topic = (mod.topics || []).find((t) => t.id === raw.topicId);
        if (topic) topicLabel = topic.label;
      }
    }
  }

  const values = [raw.technicalRating, raw.communicationRating].map(Number).filter(Boolean);
  return {
    id: raw.id,
    intern_user_id: raw.internUserId,
    manager_user_id: raw.managerUserId,
    intern_name: intern?.name || "Unknown intern",
    manager_name: manager?.name || "Unknown manager",
    module_id: raw.moduleId,
    topic_id: raw.topicId,
    module_label: moduleLabel,
    topic_label: topicLabel,
    technical_rating: raw.technicalRating,
    technical_comment: raw.technicalComment,
    communication_rating: raw.communicationRating,
    communication_comment: raw.communicationComment,
    average_rating: values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
      : 0,
    is_complete: Boolean(raw.technicalRating && raw.communicationRating),
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,
  };
}

export async function serializeIntern(user) {
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  const [summary, modulesCount, reviewsCount, approvalsCount] = await Promise.all([
    reviewSummary(raw.id),
    Module.countDocuments(),
    Review.countDocuments({ internUserId: raw.id }),
    Approval.countDocuments({ requesterUserId: raw.id }),
  ]);
  return {
    ...publicUser(raw),
    review_summary: summary,
    profile_stats: {
      completed_modules: Number(raw.completedModules || 0),
      total_modules: modulesCount,
      reviews_received: reviewsCount,
      approvals_requested: approvalsCount,
    },
  };
}
