import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { nextNumericId } from "../utils/ids.js";
import { serializeReview } from "../utils/serializers.js";

const clean = (value) => String(value || "").trim();

export const listReviews = asyncHandler(async (req, res) => {
  const filter = req.user.role === "intern" ? { internUserId: req.user.id } : {};
  const reviews = await Review.find(filter).sort({ updatedAt: -1 });
  res.json({ data: await Promise.all(reviews.map(serializeReview)) });
});

/**
 * Finds an existing Review for the same manager+intern+module+topic, or creates one.
 * This ensures tech and communication ratings for the same session are stored in one record.
 */
async function upsertReview({ managerUserId, internUserId, moduleId, topicId, patch }) {
  const query = {
    managerUserId,
    internUserId,
    moduleId: moduleId || null,
    topicId: topicId || null,
  };

  let review = await Review.findOne(query).sort({ updatedAt: -1 });

  if (review) {
    console.log("[Review] Updating existing review id:", review.id, { managerUserId, internUserId, moduleId, topicId });
    Object.assign(review, patch);
    await review.save();
  } else {
    const nextId = await nextNumericId(Review);
    console.log("[Review] Creating new review with id:", nextId, { managerUserId, internUserId, moduleId, topicId });
    review = new Review({
      id: nextId,
      managerUserId,
      internUserId,
      moduleId: moduleId || null,
      topicId: topicId || null,
      technicalRating: 0,
      technicalComment: "",
      communicationRating: 0,
      communicationComment: "",
      ...patch,
    });
    await review.save();
  }

  console.log("[Review] Saved review id:", review.id);
  return review;
}

export const saveTechnicalReview = asyncHandler(async (req, res) => {
  console.log("[saveTechnicalReview] body:", JSON.stringify(req.body));

  const internUserId = Number(req.body.intern_user_id);
  if (!internUserId) throw new HttpError(400, "intern_user_id is required.");

  const intern = await User.findOne({ id: internUserId, role: "intern" });
  if (!intern) throw new HttpError(404, "Intern not found.");

  const rating = Number(req.body.technical_rating || 0);
  if (rating < 1 || rating > 5) throw new HttpError(400, "technical_rating must be between 1 and 5.");

  const moduleId = clean(req.body.module_id) || null;
  const topicId = clean(req.body.topic_id) || null;

  const review = await upsertReview({
    managerUserId: req.user.id,
    internUserId,
    moduleId,
    topicId,
    patch: {
      technicalRating: rating,
      technicalComment: clean(req.body.technical_comment),
    },
  });

  console.log("[saveTechnicalReview] Review saved, sending notification...");

  await createNotification({
    userId: internUserId,
    actorUserId: req.user.id,
    title: "Technical review received",
    message: `${req.user.name} added technical feedback${moduleId ? ` on module ${moduleId}` : ""}.`,
    notificationType: "review",
  });

  console.log("[saveTechnicalReview] Notification sent, serializing...");

  const serialized = await serializeReview(review);

  res.json({ message: "Technical review saved.", data: serialized });
});

export const saveCommunicationReview = asyncHandler(async (req, res) => {
  console.log("[saveCommunicationReview] body:", JSON.stringify(req.body));

  const internUserId = Number(req.body.intern_user_id);
  if (!internUserId) throw new HttpError(400, "intern_user_id is required.");

  const intern = await User.findOne({ id: internUserId, role: "intern" });
  if (!intern) throw new HttpError(404, "Intern not found.");

  const rating = Number(req.body.communication_rating || 0);
  if (rating < 1 || rating > 5) throw new HttpError(400, "communication_rating must be between 1 and 5.");

  const moduleId = clean(req.body.module_id) || null;
  const topicId = clean(req.body.topic_id) || null;

  const review = await upsertReview({
    managerUserId: req.user.id,
    internUserId,
    moduleId,
    topicId,
    patch: {
      communicationRating: rating,
      communicationComment: clean(req.body.communication_comment),
    },
  });

  console.log("[saveCommunicationReview] Review saved, sending notification...");

  await createNotification({
    userId: internUserId,
    actorUserId: req.user.id,
    title: "Communication review received",
    message: `${req.user.name} added communication feedback${moduleId ? ` on module ${moduleId}` : ""}.`,
    notificationType: "review",
  });

  console.log("[saveCommunicationReview] Notification sent, serializing...");

  const serialized = await serializeReview(review);

  res.json({ message: "Communication review saved.", data: serialized });
});