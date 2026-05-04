import { ROLES } from "../constants/roles.js";
import { Approval } from "../models/Approval.js";
import { Module } from "../models/Module.js";
import { ModuleUnlock } from "../models/ModuleUnlock.js";
import { TopicProgress } from "../models/TopicProgress.js";
import { TopicPocFile } from "../models/TopicPocFile.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { nextNumericId } from "../utils/ids.js";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getOrCreateProgress(internUserId, moduleId, topicId) {
  let progress = await TopicProgress.findOne({ internUserId, moduleId, topicId });
  if (!progress) {
    progress = await TopicProgress.create({
      id: await nextNumericId(TopicProgress),
      internUserId,
      moduleId,
      topicId,
    });
  }
  return progress;
}

function serializeProgress(p) {
  const raw = typeof p.toObject === "function" ? p.toObject() : p;
  return {
    id: raw.id,
    intern_user_id: raw.internUserId,
    module_id: raw.moduleId,
    topic_id: raw.topicId,
    theory_submitted: raw.theorySubmitted,
    practical_submitted: raw.practicalSubmitted,
    theory_approved: raw.theoryApproved,
    practical_approved: raw.practicalApproved,
    pending_approval_id: raw.pendingApprovalId,
    updated_at: raw.updatedAt,
  };
}

/**
 * Determines whether a given moduleId is accessible for an intern to submit.
 *
 * Logic:
 * 1. If modules exist in the DB, use DB order (index 0 = always accessible).
 * 2. If modules are NOT in the DB (localStorage-only workflow), fall back to:
 *    - Allow if this intern has never submitted to any OTHER moduleId (first module heuristic)
 *    - OR if an unlock record exists for this moduleId
 */
async function isModuleAccessible(internUserId, moduleId) {
  // Check for an existing unlock record first (covers all non-first modules)
  const unlockDoc = await ModuleUnlock.findOne({
    internUserId,
    moduleId,
    status: { $in: ["unlocked", "pending"] },
  });
  if (unlockDoc) return true;

  // Try DB-based order check
  const allModules = await Module.find().sort({ uploadedAt: 1 }).lean();

  if (allModules.length > 0) {
    const moduleIndex = allModules.findIndex((m) => m.moduleId === moduleId);
    // If found in DB and is first → accessible
    if (moduleIndex === 0) return true;
    // If found in DB and not first → need unlock (no unlock doc found above)
    if (moduleIndex > 0) return false;
    // moduleIndex === -1 means not in DB — fall through to heuristic below
  }

  // Fallback: module not in DB (localStorage-only).
  // Allow if this intern has no prior submissions to a DIFFERENT moduleId.
  // This means they haven't unlocked anything else yet → this must be their first module.
  const otherModuleProgress = await TopicProgress.findOne({
    internUserId,
    moduleId: { $ne: moduleId },
  }).lean();

  if (!otherModuleProgress) {
    // No submissions to any other module → treat this as the first module
    return true;
  }

  // They've submitted to other modules but no unlock for this one
  return false;
}

// ─── Get all progress for an intern ────────────────────────────────────────

export const getMyProgress = asyncHandler(async (req, res) => {
  const internUserId = req.user.role === ROLES.INTERN
    ? req.user.id
    : Number(req.query.intern_user_id);

  if (!internUserId) throw new HttpError(400, "intern_user_id required");

  const progress = await TopicProgress.find({ internUserId }).lean();
  res.json({ data: progress.map(serializeProgress) });
});

// ─── Intern submits a topic part (theory / practical / both) ───────────────

export const submitTopicPart = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.INTERN) throw new HttpError(403, "Interns only.");

  const { module_id, topic_id, completion_type } = req.body;

  // Handle module_complete — delegate to dedicated handler
  if (completion_type === "module_complete") {
    return submitModuleComplete(req, res);
  }

  if (!module_id || !topic_id || !completion_type) {
    throw new HttpError(400, "module_id, topic_id, and completion_type are required.");
  }
  if (!["theory", "practical", "both"].includes(completion_type)) {
    throw new HttpError(400, "completion_type must be theory, practical, or both.");
  }

  // Check module access
  const accessible = await isModuleAccessible(req.user.id, module_id);
  if (!accessible) {
    throw new HttpError(403, "This module is locked. Complete the previous module first.");
  }

  const progress = await getOrCreateProgress(req.user.id, module_id, topic_id);

  // Mark submitted — NO approval created, NO manager notification.
  // The intern will submit the full module once all topics are done.
  if (completion_type === "theory" || completion_type === "both") {
    progress.theorySubmitted = true;
  }
  if (completion_type === "practical" || completion_type === "both") {
    progress.practicalSubmitted = true;
  }

  await progress.save();

  res.status(201).json({
    message: "Progress saved.",
    data: serializeProgress(progress),
  });
});

// ─── Intern submits entire module for manager approval ──────────────────────

async function submitModuleComplete(req, res) {
  const { module_id } = req.body;
  if (!module_id) throw new HttpError(400, "module_id is required.");

  // Check module access
  const accessible = await isModuleAccessible(req.user.id, module_id);
  if (!accessible) {
    throw new HttpError(403, "This module is locked. Complete the previous module first.");
  }

  // Verify all topics in the module are submitted before allowing module-level approval request
  const mod = await Module.findOne({ moduleId: module_id }).lean();
  if (mod) {
    const topicIds = (mod.topics || []).map((t) => t.id);
    const progressRecords = await TopicProgress.find({
      internUserId: req.user.id,
      moduleId: module_id,
    }).lean();

    const allSubmitted = topicIds.every((tid) => {
      const p = progressRecords.find((pp) => pp.topicId === tid);
      if (!p) return false;
      const topic = mod.topics.find((t) => t.id === tid);
      const concept = (topic?.concept || "theory").toLowerCase();
      const needsTheory = concept.includes("theory") || concept === "both";
      const needsPractical = concept.includes("practical") || concept === "both";
      if (needsTheory && !p.theorySubmitted) return false;
      if (needsPractical && !p.practicalSubmitted) return false;
      return true;
    });

    if (!allSubmitted) {
      throw new HttpError(400, "Complete all topics before submitting the module for approval.");
    }
  }

  // Check if a pending module_complete approval already exists
  const existing = await Approval.findOne({
    requesterUserId: req.user.id,
    moduleId: module_id,
    requestType: "module_complete",
    status: "pending",
  });
  if (existing) {
    return res.json({ message: "Module approval already pending.", approval_id: existing.id });
  }

  // Create a single approval request for the entire module
  const approval = await Approval.create({
    id: await nextNumericId(Approval),
    requesterUserId: req.user.id,
    requestType: "module_complete",
    moduleId: module_id,
    completionType: "both",
    reason: `Intern completed all topics in module ${module_id} and is requesting approval.`,
  });

  // Notify all managers/admins
  const managers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.MANAGER] } }).lean();
  for (const mgr of managers) {
    await createNotification({
      userId: mgr.id,
      actorUserId: req.user.id,
      title: "Module completion submitted",
      message: `${req.user.name} completed all topics in module ${module_id} and is requesting approval.`,
      notificationType: "approval",
    });
  }

  res.status(201).json({
    message: "Module submitted for approval.",
    approval_id: approval.id,
  });
}

// ─── Manager approves / rejects a topic submit approval ────────────────────

export const approveTopicSubmit = asyncHandler(async (req, res) => {
  if (req.user.role === ROLES.INTERN) throw new HttpError(403, "Managers only.");

  const approval = await Approval.findOne({ id: Number(req.params.approvalId) });
  if (!approval) throw new HttpError(404, "Approval not found.");
  if (!["topic_submit", "module_complete"].includes(approval.requestType)) {
    throw new HttpError(400, "This approval is not a topic or module submission.");
  }

  const { status, review_notes } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    throw new HttpError(400, "status must be approved or rejected.");
  }

  approval.status = status;
  approval.reviewNotes = review_notes || "";
  approval.reviewerUserId = req.user.id;
  await approval.save();

  if (status === "approved") {
    if (approval.requestType === "module_complete") {
      // Approve all topic progress records for this module
      const mod = await Module.findOne({ moduleId: approval.moduleId }).lean();
      const topicIds = mod ? (mod.topics || []).map((t) => t.id) : [];
      for (const tid of topicIds) {
        const p = await TopicProgress.findOne({
          internUserId: approval.requesterUserId,
          moduleId: approval.moduleId,
          topicId: tid,
        });
        if (p) {
          const topic = mod.topics.find((t) => t.id === tid);
          const concept = (topic?.concept || "theory").toLowerCase();
          if (concept.includes("theory") || concept === "both" || (!concept.includes("practical"))) {
            p.theoryApproved = true;
          }
          if (concept.includes("practical") || concept === "both") {
            p.practicalApproved = true;
          }
          p.pendingApprovalId = null;
          await p.save();
        }
      }
      // Update completedModules on user
      const allModules = await Module.find().sort({ uploadedAt: 1 }).lean();
      const moduleIndex = allModules.findIndex((m) => m.moduleId === approval.moduleId);
      if (moduleIndex >= 0) {
        await User.findOneAndUpdate(
          { id: approval.requesterUserId },
          { completedModules: moduleIndex + 1 }
        );
      }
    } else {
      // topic_submit: approve individual topic
      const progress = await TopicProgress.findOne({
        internUserId: approval.requesterUserId,
        moduleId: approval.moduleId,
        topicId: approval.topicId,
      });
      if (progress) {
        const ct = approval.completionType;
        if (ct === "theory" || ct === "both") progress.theoryApproved = true;
        if (ct === "practical" || ct === "both") progress.practicalApproved = true;
        progress.pendingApprovalId = null;
        await progress.save();
      }
    }
  }

  // Notify intern
  await createNotification({
    userId: approval.requesterUserId,
    actorUserId: req.user.id,
    title: `${approval.requestType === "module_complete" ? "Module" : "Topic"} completion ${status}`,
    message: approval.requestType === "module_complete"
      ? `${req.user.name} ${status} your module completion for module ${approval.moduleId}.`
      : `${req.user.name} ${status} your ${approval.completionType} submission for topic ${approval.topicId}.`,
    notificationType: "approval",
  });

  res.json({ message: `Approval ${status}.`, approval_id: approval.id });
});

// ─── Module unlock flow ─────────────────────────────────────────────────────

export const requestModuleUnlock = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.INTERN) throw new HttpError(403, "Interns only.");

  const { module_id } = req.body;
  if (!module_id) throw new HttpError(400, "module_id is required.");

  const existing = await ModuleUnlock.findOne({ internUserId: req.user.id, moduleId: module_id });
  if (existing?.status === "unlocked") {
    return res.json({ message: "Module already unlocked." });
  }
  if (existing?.status === "pending") {
    return res.json({ message: "Unlock request already pending." });
  }

  // Try DB-based check first
  const allModules = await Module.find().sort({ uploadedAt: 1 }).lean();
  const moduleIndex = allModules.findIndex((m) => m.moduleId === module_id);

  // If modules are in DB and this is the first one, no unlock needed
  if (allModules.length > 0 && moduleIndex === 0) {
    return res.json({ message: "First module is always unlocked." });
  }

  // If modules are in DB, check previous module completion
  if (allModules.length > 0 && moduleIndex > 0) {
    const prevModule = allModules[moduleIndex - 1];
    const prevTopicIds = (prevModule.topics || []).map((t) => t.id);
    const prevProgress = await TopicProgress.find({
      internUserId: req.user.id,
      moduleId: prevModule.moduleId,
    }).lean();

    const allApproved = prevTopicIds.every((tid) => {
      const p = prevProgress.find((pp) => pp.topicId === tid);
      if (!p) return false;
      const topic = prevModule.topics.find((t) => t.id === tid);
      const concept = (topic?.concept || "theory").toLowerCase();
      const needsTheory = concept.includes("theory") || concept === "both";
      const needsPractical = concept.includes("practical") || concept === "both";
      if (needsTheory && !p.theoryApproved) return false;
      if (needsPractical && !p.practicalApproved) return false;
      return true;
    });

    if (!allApproved) {
      throw new HttpError(400, "Complete and get all topics in the previous module approved first.");
    }
  }
  // If moduleIndex === -1 (not in DB / localStorage-only), skip the previous-module check
  // and trust the frontend — the manager will review the approval anyway.

  const resolvedIndex = moduleIndex >= 0 ? moduleIndex : 1; // treat unknown as non-first

  // Create or update unlock doc
  const unlockDoc = existing
    ? await ModuleUnlock.findOneAndUpdate(
        { internUserId: req.user.id, moduleId: module_id },
        { status: "pending", requestedAt: new Date() },
        { new: true }
      )
    : await ModuleUnlock.create({
        id: await nextNumericId(ModuleUnlock),
        internUserId: req.user.id,
        moduleId: module_id,
        moduleIndex: resolvedIndex,
        status: "pending",
        requestedAt: new Date(),
      });

  // Create an approval record
  const approval = await Approval.create({
    id: await nextNumericId(Approval),
    requesterUserId: req.user.id,
    requestType: "module_unlock",
    moduleId: module_id,
    reason: `Intern requesting unlock for module ${module_id} (index ${resolvedIndex}).`,
  });

  // Notify managers (sequential to avoid nextNumericId race condition)
  const managers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.MANAGER] } }).lean();
  for (const mgr of managers) {
    await createNotification({
      userId: mgr.id,
      actorUserId: req.user.id,
      title: "Module unlock requested",
      message: `${req.user.name} has completed all topics in the previous module and is requesting to unlock the next module.`,
      notificationType: "approval",
    });
  }

  res.status(201).json({ message: "Module unlock request sent.", approval_id: approval.id });
});

export const approveModuleUnlock = asyncHandler(async (req, res) => {
  if (req.user.role === ROLES.INTERN) throw new HttpError(403, "Managers only.");

  const approval = await Approval.findOne({ id: Number(req.params.approvalId) });
  if (!approval) throw new HttpError(404, "Approval not found.");
  if (approval.requestType !== "module_unlock") {
    throw new HttpError(400, "This approval is not a module unlock request.");
  }

  const { status, review_notes } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    throw new HttpError(400, "status must be approved or rejected.");
  }

  approval.status = status;
  approval.reviewNotes = review_notes || "";
  approval.reviewerUserId = req.user.id;
  await approval.save();

  if (status === "approved") {
    await ModuleUnlock.findOneAndUpdate(
      { internUserId: approval.requesterUserId, moduleId: approval.moduleId },
      { status: "unlocked", approvedAt: new Date(), approvedByUserId: req.user.id },
      { upsert: true }
    );

    // Update completedModules count on user
    const allModules = await Module.find().sort({ uploadedAt: 1 }).lean();
    const moduleIndex = allModules.findIndex((m) => m.moduleId === approval.moduleId);
    if (moduleIndex >= 0) {
      await User.findOneAndUpdate(
        { id: approval.requesterUserId },
        { completedModules: moduleIndex }
      );
    }
  }

  await createNotification({
    userId: approval.requesterUserId,
    actorUserId: req.user.id,
    title: `Module unlock ${status}`,
    message: `${req.user.name} ${status} your request to unlock module ${approval.moduleId}.`,
    notificationType: "approval",
  });

  res.json({ message: `Module unlock ${status}.` });
});

// ─── Get all unlock statuses for an intern ─────────────────────────────────

export const getModuleUnlocks = asyncHandler(async (req, res) => {
  const internUserId = req.user.role === ROLES.INTERN
    ? req.user.id
    : Number(req.query.intern_user_id);

  if (!internUserId) throw new HttpError(400, "intern_user_id required");

  const unlocks = await ModuleUnlock.find({ internUserId }).lean();
  res.json({
    data: unlocks.map((u) => ({
      module_id: u.moduleId,
      module_index: u.moduleIndex,
      status: u.status,
      requested_at: u.requestedAt,
      approved_at: u.approvedAt,
    })),
  });
});
// ─── POC file upload (practical topics) ─────────────────────────────────────

export const uploadPoc = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.INTERN) throw new HttpError(403, "Interns only.");
  if (!req.file) throw new HttpError(400, "No file uploaded.");

  const { module_id, topic_id } = req.body;
  if (!module_id || !topic_id) throw new HttpError(400, "module_id and topic_id are required.");

  const pocFile = await TopicPocFile.create({
    id: await nextNumericId(TopicPocFile),
    internUserId: req.user.id,
    moduleId: module_id,
    topicId: topic_id,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });

  // Notify managers
  const managers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.MANAGER] } }).lean();
  for (const mgr of managers) {
    await createNotification({
      userId: mgr.id,
      actorUserId: req.user.id,
      title: "POC file uploaded",
      message: `${req.user.name} uploaded a POC file for topic ${topic_id} in module ${module_id}.`,
      notificationType: "approval",
    });
  }

  res.status(201).json({
    message: "POC uploaded.",
    data: {
      id: pocFile.id,
      original_name: pocFile.originalName,
      stored_name: pocFile.storedName,
      module_id: pocFile.moduleId,
      topic_id: pocFile.topicId,
      uploaded_at: pocFile.createdAt,
    },
  });
});

export const getPocFiles = asyncHandler(async (req, res) => {
  const internUserId = req.user.role === ROLES.INTERN
    ? req.user.id
    : Number(req.query.intern_user_id);

  if (!internUserId) throw new HttpError(400, "intern_user_id required");

  const filter = { internUserId };
  if (req.query.module_id) filter.moduleId = req.query.module_id;
  if (req.query.topic_id) filter.topicId = req.query.topic_id;

  const files = await TopicPocFile.find(filter).sort({ createdAt: -1 }).lean();
  res.json({
    data: files.map((f) => ({
      id: f.id,
      module_id: f.moduleId,
      topic_id: f.topicId,
      original_name: f.originalName,
      stored_name: f.storedName,
      mime_type: f.mimeType,
      size_bytes: f.sizeBytes,
      uploaded_at: f.createdAt,
    })),
  });
});