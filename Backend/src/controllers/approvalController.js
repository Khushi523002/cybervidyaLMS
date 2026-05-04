import { ROLES } from "../constants/roles.js";
import { Approval } from "../models/Approval.js";
import { Module } from "../models/Module.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { nextNumericId } from "../utils/ids.js";

const clean = (value) => String(value || "").trim();

async function serializeApproval(approval) {
  const raw = typeof approval.toObject === "function" ? approval.toObject() : approval;
  const requester = await User.findOne({ id: raw.requesterUserId }).lean();

  // Try to look up module label and topic label
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

  return {
    id: raw.id,
    requester_name: requester?.name,
    requester_user_id: raw.requesterUserId,
    reviewer_user_id: raw.reviewerUserId,
    request_type: raw.requestType,
    module_id: raw.moduleId,
    topic_id: raw.topicId,
    module_label: moduleLabel,
    topic_label: topicLabel,
    completion_type: raw.completionType,
    reason: raw.reason,
    status: raw.status,
    review_notes: raw.reviewNotes,
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,
  };
}

export const listApprovals = asyncHandler(async (req, res) => {
  const filter = req.user.role === ROLES.INTERN ? { requesterUserId: req.user.id } : {};
  const approvals = await Approval.find(filter).sort({ createdAt: -1 });
  res.json({ data: await Promise.all(approvals.map(serializeApproval)) });
});

export const createApproval = asyncHandler(async (req, res) => {
  if (!clean(req.body.reason)) throw new HttpError(400, "Reason is required.");

  const approval = await Approval.create({
    id: await nextNumericId(Approval),
    requesterUserId: req.user.id,
    requestType: clean(req.body.request_type) || "edit",
    reason: clean(req.body.reason),
  });

  const staff = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.MANAGER] } }).lean();
  for (const user of staff) {
    await createNotification({
      userId: user.id,
      actorUserId: req.user.id,
      title: "New approval request",
      message: `${req.user.name} requested ${approval.requestType} permission.`,
      notificationType: "approval",
    });
  }

  res.status(201).json({ message: "Approval request submitted.", data: await serializeApproval(approval) });
});

export const reviewApproval = asyncHandler(async (req, res) => {
  const approval = await Approval.findOne({ id: Number(req.params.id) });
  if (!approval) throw new HttpError(404, "Approval not found.");

  // Delegate topic_submit and module_unlock to their dedicated routes
  if (["topic_submit", "module_unlock"].includes(approval.requestType)) {
    throw new HttpError(400, `Use /api/intern/progress/approve/:id or /api/intern/unlocks/approve/:id for this type.`);
  }

  approval.status = ["approved", "rejected"].includes(req.body.status) ? req.body.status : "pending";
  approval.reviewNotes = clean(req.body.review_notes);
  approval.reviewerUserId = req.user.id;
  await approval.save();

  const requester = await User.findOne({ id: approval.requesterUserId });
  if (approval.status === "approved" && requester) {
    if (approval.requestType === "edit") requester.internCanEdit = true;
    if (approval.requestType === "delete") requester.internCanDelete = true;
    await requester.save();
  }

  await createNotification({
    userId: approval.requesterUserId,
    actorUserId: req.user.id,
    title: `Approval ${approval.status}`,
    message: `${req.user.name} ${approval.status} your ${approval.requestType} request.`,
    notificationType: "approval",
  });

  res.json({ message: `Approval ${approval.status}.`, data: await serializeApproval(approval) });
});