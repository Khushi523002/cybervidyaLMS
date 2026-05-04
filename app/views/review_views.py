from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from app.authentication import auth_required, json_error, parse_json_body
from app.models import Review, UserAccount
from app.models.notifications_models import Notification
from app.models.onboard_models import UserRole
from app.notifications import create_notification
from app.permissions.review_permissions import can_create_review, can_edit_review, can_view_review
from app.serializers.review_serializers import (
    review_to_dict,
    validate_review_payload,
    validate_review_section_payload,
)


def resolve_intern_from_payload(payload):
    intern_lookup = UserAccount.objects.filter(role=UserRole.INTERN)

    if payload.get("intern_user_id") not in (None, ""):
        intern = intern_lookup.filter(id=payload["intern_user_id"]).first()
        if intern is not None:
            return intern

    intern_identifier = payload.get("intern_id")
    if intern_identifier in (None, ""):
        return None

    intern_identifier = str(intern_identifier).strip()
    intern = intern_lookup.filter(intern_id=intern_identifier).first()
    if intern is not None:
        return intern

    if intern_identifier.isdigit():
        return intern_lookup.filter(id=int(intern_identifier)).first()

    return None


def apply_review_fields(review, payload):
    for field in (
        "communication_rating",
        "communication_comment",
        "technical_rating",
        "technical_comment",
    ):
        if field not in payload:
            continue
        value = payload[field]
        if field.endswith("_rating") and value not in (None, ""):
            value = int(value)
        elif value is None:
            value = ""
        else:
            value = str(value).strip()
        setattr(review, field, value)


def save_review_section(review, payload, section):
    rating_field = f"{section}_rating"
    comment_field = f"{section}_comment"
    review_payload = {
        rating_field: payload[rating_field],
        comment_field: payload[comment_field],
    }
    apply_review_fields(review, review_payload)
    review.save()


def notify_review_event(review, actor, notification_type, section, verb):
    section_label = section.capitalize()
    create_notification(
        recipient=review.intern,
        actor=actor,
        notification_type=notification_type,
        title=f"{section_label} review {verb}",
        message=f"{actor.name} {verb} your {section} review.",
        entity_type="review",
        entity_id=review.id,
    )


def get_review_for_section_create(manager, intern, section):
    empty_field = f"{section}_rating__isnull"
    existing_review = (
        Review.objects.filter(manager=manager, intern=intern, **{empty_field: True})
        .order_by("-created_at")
        .first()
    )
    if existing_review is not None:
        return existing_review, False

    return Review.objects.create(intern=intern, manager=manager), True


@csrf_exempt
@auth_required()
def review_collection_view(request):
    user = request.auth_user

    if request.method == "GET":
        queryset = Review.objects.select_related("intern", "manager")
        if user.role == UserRole.ADMIN:
            min_average = request.GET.get("min_average_rating")
            max_average = request.GET.get("max_average_rating")
            try:
                if min_average:
                    queryset = [
                        review
                        for review in queryset
                        if review.average_rating is not None and review.average_rating >= float(min_average)
                    ]
                if max_average:
                    queryset = [
                        review
                        for review in queryset
                        if review.average_rating is not None and review.average_rating <= float(max_average)
                    ]
            except ValueError:
                return json_error("min_average_rating and max_average_rating must be numeric values.")
        elif user.role == UserRole.MANAGER:
            queryset = queryset.filter(manager=user)
        else:
            queryset = queryset.filter(intern=user)

        return JsonResponse(
            {
                "message": "Reviews fetched successfully.",
                "data": [review_to_dict(review) for review in queryset],
            }
        )

    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    if not can_create_review(user):
        return json_error("Only manager users can create reviews.", status=403)

    try:
        payload = parse_json_body(request)
        validate_review_payload(payload)
    except ValueError as exc:
        return json_error(str(exc))

    intern = resolve_intern_from_payload(payload)
    if intern is None:
        return json_error(
            "Intern not found. Use a valid intern_user_id, intern_id like 'INT-1001', or the numeric user id.",
            status=404,
        )

    review = Review(intern=intern, manager=user)
    apply_review_fields(review, payload)
    review.save()
    notify_review_event(review, user, Notification.NotificationType.REVIEW_CREATED, "combined", "added")

    return JsonResponse(
        {
            "message": "Review created successfully.",
            "data": review_to_dict(review),
        },
        status=201,
    )


@csrf_exempt
@auth_required()
def review_detail_view(request, review_id):
    review = Review.objects.select_related("intern", "manager").filter(id=review_id).first()
    if review is None:
        return json_error("Review not found.", status=404)
    actor = request.auth_user

    if not can_view_review(actor, review):
        return json_error("You do not have permission to view this review.", status=403)

    if request.method == "GET":
        return JsonResponse({"message": "Review fetched successfully.", "data": review_to_dict(review)})

    if request.method not in {"PUT", "PATCH"}:
        return json_error("Method not allowed.", status=405)

    if not can_edit_review(actor, review):
        return json_error("You do not have permission to edit this review.", status=403)

    try:
        payload = parse_json_body(request)
        validate_review_payload(payload, partial=True)
    except ValueError as exc:
        return json_error(str(exc))

    apply_review_fields(review, payload)
    review.save()
    notify_review_event(review, actor, Notification.NotificationType.REVIEW_UPDATED, "combined", "updated")

    return JsonResponse({"message": "Review updated successfully.", "data": review_to_dict(review)})


@csrf_exempt
@auth_required()
def review_section_create_view(request, section):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    actor = request.auth_user
    if not can_create_review(actor):
        return json_error("Only manager users can create reviews.", status=403)

    try:
        payload = parse_json_body(request)
        validate_review_section_payload(section, payload, partial=False, require_intern_reference=True)
    except ValueError as exc:
        return json_error(str(exc))

    intern = resolve_intern_from_payload(payload)
    if intern is None:
        return json_error(
            "Intern not found. Use a valid intern_user_id, intern_id like 'INT-1001', or the numeric user id.",
            status=404,
        )

    review, created = get_review_for_section_create(actor, intern, section)
    save_review_section(review, payload, section)
    notify_review_event(
        review,
        actor,
        Notification.NotificationType.REVIEW_CREATED if created else Notification.NotificationType.REVIEW_UPDATED,
        section,
        "added" if created else "updated",
    )

    return JsonResponse(
        {
            "message": f"{section.capitalize()} review saved successfully.",
            "data": review_to_dict(review),
        },
        status=201 if created else 200,
    )


@csrf_exempt
@auth_required()
def review_section_update_view(request, review_id, section):
    if request.method not in {"PUT", "PATCH"}:
        return json_error("Method not allowed.", status=405)

    actor = request.auth_user
    review = Review.objects.select_related("intern", "manager").filter(id=review_id).first()
    if review is None:
        return json_error("Review not found.", status=404)

    if not can_edit_review(actor, review):
        return json_error("You do not have permission to edit this review.", status=403)

    try:
        payload = parse_json_body(request)
        validate_review_section_payload(section, payload, partial=False, require_intern_reference=False)
    except ValueError as exc:
        return json_error(str(exc))

    save_review_section(review, payload, section)
    notify_review_event(review, actor, Notification.NotificationType.REVIEW_UPDATED, section, "updated")

    return JsonResponse(
        {
            "message": f"{section.capitalize()} review updated successfully.",
            "data": review_to_dict(review),
        }
    )
