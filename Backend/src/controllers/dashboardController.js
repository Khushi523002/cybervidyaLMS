import { ROLES } from "../constants/roles.js";
import { Approval } from "../models/Approval.js";
import { Module } from "../models/Module.js";
import { Notification } from "../models/Notification.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUser, reviewSummary, serializeIntern, serializeReview } from "../utils/serializers.js";

export const listInterns = asyncHandler(async (req, res) => {
  const users = await User.find({ role: ROLES.INTERN }).sort({ id: 1 });
  let interns = await Promise.all(users.map(serializeIntern));

  const min = Number(req.query.min_review_rating || 0);
  const max = Number(req.query.max_review_rating || 0);
  if (min) interns = interns.filter((intern) => intern.review_summary.overall_rating_average >= min);
  if (max) interns = interns.filter((intern) => intern.review_summary.overall_rating_average <= max);

  res.json({ data: interns });
});

export const listManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ role: ROLES.MANAGER }).sort({ id: 1 }).lean();
  const data = await Promise.all(
    managers.map(async (mgr) => {
      const reviewsGiven = await Review.countDocuments({ managerUserId: mgr.id });
      return {
        ...publicUser(mgr),
        reviews_given: reviewsGiven,
      };
    })
  );
  res.json({ data });
});

export const overview = asyncHandler(async (req, res) => {
  const [modulesCount, interns, managers, pendingApprovals, reviews, notifications] = await Promise.all([
    Module.countDocuments(),
    User.find({ role: ROLES.INTERN }).sort({ id: 1 }),
    User.find({ role: ROLES.MANAGER }).sort({ id: 1 }).lean(),
    Approval.find({ status: "pending" }).sort({ createdAt: -1 }).lean(),
    Review.find().sort({ updatedAt: -1 }).limit(5),
    Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const serializedInterns = await Promise.all(interns.map(serializeIntern));
  const recentReviews = await Promise.all(reviews.map(serializeReview));
  const base = {
    role: req.user.role,
    user_profile: publicUser(req.user),
    stats: {
      modules: modulesCount,
      interns: interns.length,
      managers: managers.length,
      pending_approvals: pendingApprovals.length,
      reviews: await Review.countDocuments(),
    },
    recent_activity: notifications.map((notification) => ({
      activity_type: notification.notificationType,
      title: notification.title,
      message: notification.message,
      timestamp: notification.createdAt,
    })),
  };

  if (req.user.role === ROLES.INTERN) {
    const [myReviews, myApprovals, summary] = await Promise.all([
      Review.find({ internUserId: req.user.id }).sort({ updatedAt: -1 }),
      Approval.find({ requesterUserId: req.user.id }).sort({ createdAt: -1 }).lean(),
      reviewSummary(req.user.id),
    ]);
    return res.json({
      data: {
        ...base,
        review_summary: summary,
        my_reviews: await Promise.all(myReviews.map(serializeReview)),
        my_approvals: myApprovals.map((approval) => ({
          id: approval.id,
          request_type: approval.requestType,
          reason: approval.reason,
          status: approval.status,
          review_notes: approval.reviewNotes,
          created_at: approval.createdAt,
        })),
      },
    });
  }

  res.json({
    data: {
      ...base,
      interns: serializedInterns,
      pending_approvals: pendingApprovals.map((approval) => ({
        id: approval.id,
        requester_name: serializedInterns.find((intern) => intern.id === approval.requesterUserId)?.name,
        request_type: approval.requestType,
        reason: approval.reason,
        status: approval.status,
        created_at: approval.createdAt,
      })),
      recent_reviews: recentReviews,
      recent_reviews_given: recentReviews,
    },
  });
});
