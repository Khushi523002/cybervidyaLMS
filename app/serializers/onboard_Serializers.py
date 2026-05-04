from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from app.models import ApprovalRequest, Notification, Review
from app.models.onboard_models import UserRole
from app.serializers.approvals_serializers import approval_to_dict
from app.serializers.notifications_serializers import notification_to_dict
from app.serializers.review_serializers import review_summary_from_user, review_to_dict


def validate_onboarding_payload(payload, partial=False):
    required_fields = ["name", "education", "certification", "contact_no", "email", "intern_id"]
    if not partial:
        missing_fields = [field for field in required_fields if not str(payload.get(field, "")).strip()]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}.")

    email = payload.get("email")
    if email is not None:
        try:
            validate_email(email)
        except ValidationError as exc:
            raise ValueError("Enter a valid email address.") from exc


def user_reference_to_dict(user):
    if user is None:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "intern_id": user.intern_id,
    }


def user_to_dict(user, include_permissions=True):
    data = {
        "id": user.id,
        "name": user.name,
        "role": user.role,
        "education": user.education,
        "certification": user.certification,
        "contact_no": user.contact_no,
        "email": user.email,
        "intern_id": user.intern_id,
        "is_active": user.is_active,
        "password_ready": user.password_ready,
        "must_change_password": user.must_change_password,
        "created_by_id": user.created_by_id,
        "date_joined": user.date_joined.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }
    if include_permissions and user.role == UserRole.INTERN:
        data.update(
            {
                "intern_can_edit": user.intern_can_edit,
                "intern_can_delete": user.intern_can_delete,
            }
        )
    return data


def notification_summary_for_user(user, limit=5):
    notifications = Notification.objects.select_related("actor").filter(recipient=user)
    unread_count = notifications.filter(is_read=False).count()
    return {
        "total_notifications": notifications.count(),
        "unread_notifications": unread_count,
        "recent_notifications": [notification_to_dict(notification) for notification in notifications[:limit]],
    }


def user_profile_to_dict(user, viewer=None):
    data = user_to_dict(user, include_permissions=True)
    data["created_by"] = user_reference_to_dict(user.created_by)
    if viewer and (viewer.id == user.id or viewer.role == UserRole.ADMIN):
        data["notification_summary"] = notification_summary_for_user(user)

    if user.role == UserRole.INTERN:
        reviews = Review.objects.select_related("intern", "manager").filter(intern=user)
        approvals = ApprovalRequest.objects.select_related("requester", "reviewed_by").filter(requester=user)
        data["review_summary"] = review_summary_from_user(user)
        data["reviews"] = [review_to_dict(review) for review in reviews]
        data["approvals"] = [approval_to_dict(approval) for approval in approvals]
        data["profile_stats"] = {
            "total_reviews": reviews.count(),
            "pending_approvals": approvals.filter(status=ApprovalRequest.Status.PENDING).count(),
            "approved_approvals": approvals.filter(status=ApprovalRequest.Status.APPROVED).count(),
            "rejected_approvals": approvals.filter(status=ApprovalRequest.Status.REJECTED).count(),
        }
        return data

    if user.role == UserRole.MANAGER:
        given_reviews = Review.objects.select_related("intern", "manager").filter(manager=user)
        created_interns = user.created_users.filter(role=UserRole.INTERN)
        data["reviews_given"] = [review_to_dict(review) for review in given_reviews[:10]]
        data["profile_stats"] = {
            "reviews_given_count": given_reviews.count(),
            "created_interns_count": created_interns.count(),
            "pending_approvals_to_review": ApprovalRequest.objects.filter(
                status=ApprovalRequest.Status.PENDING
            ).count(),
        }
        return data

    if user.role == UserRole.ADMIN:
        data["profile_stats"] = {
            "total_users": user.__class__.objects.count(),
            "total_admins": user.__class__.objects.filter(role=UserRole.ADMIN).count(),
            "total_managers": user.__class__.objects.filter(role=UserRole.MANAGER).count(),
            "total_interns": user.__class__.objects.filter(role=UserRole.INTERN).count(),
            "total_reviews": Review.objects.count(),
            "pending_approvals": ApprovalRequest.objects.filter(status=ApprovalRequest.Status.PENDING).count(),
        }
        return data

    return data
