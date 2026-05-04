from app.models import ApprovalRequest, Review, UserAccount
from app.models.onboard_models import UserRole
from app.serializers.approvals_serializers import approval_to_dict
from app.serializers.notifications_serializers import notification_to_dict
from app.serializers.onboard_Serializers import (
    notification_summary_for_user,
    user_profile_to_dict,
    user_to_dict,
)
from app.serializers.review_serializers import review_summary_from_user, review_to_dict


def intern_list_item(user):
    data = user_to_dict(user, include_permissions=True)
    data["review_summary"] = review_summary_from_user(user)
    return data


def sort_intern_items(items):
    items.sort(
        key=lambda item: (
            item["review_summary"]["overall_rating_average"] is None,
            -(item["review_summary"]["overall_rating_average"] or 0),
            item["name"].lower(),
        )
    )
    return items


def filter_intern_items_by_rating(items, min_rating=None, max_rating=None):
    filtered_items = items
    if min_rating is not None:
        filtered_items = [
            item
            for item in filtered_items
            if item["review_summary"]["overall_rating_average"] is not None
            and item["review_summary"]["overall_rating_average"] >= min_rating
        ]
    if max_rating is not None:
        filtered_items = [
            item
            for item in filtered_items
            if item["review_summary"]["overall_rating_average"] is not None
            and item["review_summary"]["overall_rating_average"] <= max_rating
        ]
    return filtered_items


def recent_system_activity_for_admin(limit=12):
    activities = []

    for intern in UserAccount.objects.filter(role=UserRole.INTERN).order_by("-date_joined")[:limit]:
        activities.append(
            {
                "activity_type": "onboarding",
                "timestamp": intern.date_joined.isoformat(),
                "title": "Intern onboarded",
                "message": f"{intern.name} was onboarded.",
                "user_id": intern.id,
                "intern_id": intern.intern_id,
            }
        )

    for approval in ApprovalRequest.objects.select_related("requester", "reviewed_by").order_by("-created_at")[:limit]:
        activities.append(
            {
                "activity_type": "approval",
                "timestamp": approval.updated_at.isoformat(),
                "title": f"Approval {approval.status}",
                "message": f"{approval.requester.name} submitted a {approval.request_type} approval request.",
                "approval_id": approval.id,
                "requester_id": approval.requester_id,
            }
        )

    for review in Review.objects.select_related("intern", "manager").order_by("-updated_at")[:limit]:
        activities.append(
            {
                "activity_type": "review",
                "timestamp": review.updated_at.isoformat(),
                "title": "Review updated",
                "message": f"{review.manager.name} reviewed {review.intern.name}.",
                "review_id": review.id,
                "intern_id": review.intern_id,
                "manager_id": review.manager_id,
                "average_rating": review.average_rating,
            }
        )

    activities.sort(key=lambda item: item["timestamp"], reverse=True)
    return activities[:limit]


def recent_manager_activity(manager, limit=12):
    activities = []

    for intern in manager.created_users.filter(role=UserRole.INTERN).order_by("-date_joined")[:limit]:
        activities.append(
            {
                "activity_type": "onboarding",
                "timestamp": intern.date_joined.isoformat(),
                "title": "Intern onboarded",
                "message": f"You onboarded {intern.name}.",
                "user_id": intern.id,
                "intern_id": intern.intern_id,
            }
        )

    for approval in ApprovalRequest.objects.select_related("requester", "reviewed_by").order_by("-created_at")[:limit]:
        activities.append(
            {
                "activity_type": "approval",
                "timestamp": approval.updated_at.isoformat(),
                "title": f"Approval {approval.status}",
                "message": f"{approval.requester.name} submitted a {approval.request_type} approval request.",
                "approval_id": approval.id,
                "requester_id": approval.requester_id,
            }
        )

    for review in Review.objects.select_related("intern", "manager").filter(manager=manager).order_by("-updated_at")[:limit]:
        activities.append(
            {
                "activity_type": "review",
                "timestamp": review.updated_at.isoformat(),
                "title": "Review activity",
                "message": f"You reviewed {review.intern.name}.",
                "review_id": review.id,
                "intern_id": review.intern_id,
                "average_rating": review.average_rating,
            }
        )

    activities.sort(key=lambda item: item["timestamp"], reverse=True)
    return activities[:limit]


def build_admin_dashboard(user, interns):
    intern_items = sort_intern_items([intern_list_item(intern) for intern in interns])
    pending_approvals = ApprovalRequest.objects.select_related("requester", "reviewed_by").filter(
        status=ApprovalRequest.Status.PENDING
    )
    recent_reviews = Review.objects.select_related("intern", "manager").order_by("-updated_at")[:10]

    return {
        "role": user.role,
        "user_profile": user_profile_to_dict(user, viewer=user),
        "stats": {
            "total_users": UserAccount.objects.count(),
            "total_admins": UserAccount.objects.filter(role=UserRole.ADMIN).count(),
            "total_managers": UserAccount.objects.filter(role=UserRole.MANAGER).count(),
            "total_interns": len(intern_items),
            "pending_approvals": pending_approvals.count(),
            "total_reviews": Review.objects.count(),
            "unread_notifications": notification_summary_for_user(user)["unread_notifications"],
        },
        "interns": intern_items,
        "pending_approvals": [approval_to_dict(approval) for approval in pending_approvals[:10]],
        "recent_reviews": [review_to_dict(review) for review in recent_reviews],
        "recent_activity": recent_system_activity_for_admin(),
        "notification_summary": notification_summary_for_user(user),
    }


def build_manager_dashboard(user, interns):
    managed_interns = [item for item in [intern_list_item(intern) for intern in interns] if item["created_by_id"] == user.id]
    if not managed_interns:
        managed_interns = [intern_list_item(intern) for intern in interns]
    managed_interns = sort_intern_items(managed_interns)

    given_reviews = Review.objects.select_related("intern", "manager").filter(manager=user).order_by("-updated_at")
    pending_approvals = ApprovalRequest.objects.select_related("requester", "reviewed_by").filter(
        status=ApprovalRequest.Status.PENDING
    )

    return {
        "role": user.role,
        "user_profile": user_profile_to_dict(user, viewer=user),
        "stats": {
            "managed_interns": len(managed_interns),
            "all_interns_visible": len(interns),
            "reviews_given": given_reviews.count(),
            "pending_approvals": pending_approvals.count(),
            "unread_notifications": notification_summary_for_user(user)["unread_notifications"],
        },
        "interns": managed_interns,
        "pending_approvals": [approval_to_dict(approval) for approval in pending_approvals[:10]],
        "recent_reviews_given": [review_to_dict(review) for review in given_reviews[:10]],
        "recent_activity": recent_manager_activity(user),
        "notification_summary": notification_summary_for_user(user),
    }


def build_intern_dashboard(user):
    own_reviews = Review.objects.select_related("intern", "manager").filter(intern=user).order_by("-updated_at")
    own_approvals = ApprovalRequest.objects.select_related("requester", "reviewed_by").filter(requester=user)
    notification_summary = notification_summary_for_user(user)

    return {
        "role": user.role,
        "user_profile": user_profile_to_dict(user, viewer=user),
        "stats": {
            "total_reviews": own_reviews.count(),
            "pending_approvals": own_approvals.filter(status=ApprovalRequest.Status.PENDING).count(),
            "approved_approvals": own_approvals.filter(status=ApprovalRequest.Status.APPROVED).count(),
            "unread_notifications": notification_summary["unread_notifications"],
            "intern_can_edit": user.intern_can_edit,
            "intern_can_delete": user.intern_can_delete,
        },
        "review_summary": review_summary_from_user(user),
        "my_reviews": [review_to_dict(review) for review in own_reviews],
        "my_approvals": [approval_to_dict(approval) for approval in own_approvals[:10]],
        "notification_summary": notification_summary,
        "recent_activity": [
            {
                "activity_type": "notification",
                "timestamp": notification["created_at"],
                "title": notification["title"],
                "message": notification["message"],
                "notification_id": notification["id"],
            }
            for notification in notification_summary["recent_notifications"]
        ],
    }
