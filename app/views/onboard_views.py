from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from app.authentication import auth_required, json_error, parse_json_body
from app.models import UserAccount
from app.models.notifications_models import Notification
from app.models.onboard_models import UserRole
from app.notifications import create_notification
from app.permissions.onboard_permissions import (
    can_delete_intern,
    can_edit_intern,
    can_manage_interns,
    can_view_intern_profile,
    can_view_user_profile,
)
from app.serializers.onboard_Serializers import user_profile_to_dict, user_to_dict, validate_onboarding_payload


@csrf_exempt
@auth_required()
def intern_collection_view(request):
    user = request.auth_user

    if request.method == "GET":
        queryset = UserAccount.objects.filter(role=UserRole.INTERN).order_by("-date_joined")
        if user.role == UserRole.INTERN:
            queryset = queryset.filter(id=user.id)

        return JsonResponse(
            {
                "message": "Intern list fetched successfully.",
                "data": [user_profile_to_dict(intern, viewer=user) for intern in queryset],
            }
        )

    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    if not can_manage_interns(user):
        return json_error("Only admin and manager users can onboard interns.", status=403)

    try:
        payload = parse_json_body(request)
        validate_onboarding_payload(payload)
        intern = UserAccount.objects.create_user(
            email=payload["email"].strip().lower(),
            password=None,
            name=payload["name"].strip(),
            role=UserRole.INTERN,
            education=payload["education"].strip(),
            certification=payload["certification"].strip(),
            contact_no=payload["contact_no"].strip(),
            intern_id=payload["intern_id"].strip(),
            created_by=user,
            is_staff=False,
        )
    except ValueError as exc:
        return json_error(str(exc))
    except IntegrityError:
        return json_error("An intern with the same email or intern_id already exists.")

    create_notification(
        recipient=intern,
        actor=user,
        notification_type=Notification.NotificationType.ONBOARDING_CREATED,
        title="Your account has been created",
        message=f"{user.name} created your onboarding profile.",
        entity_type="intern",
        entity_id=intern.id,
    )

    return JsonResponse(
        {
            "message": "Intern onboarded successfully. Account created and waiting for password generation.",
            "data": user_to_dict(intern),
        },
        status=201,
    )


@csrf_exempt
@auth_required()
def intern_detail_view(request, user_id):
    actor = request.auth_user
    intern = get_object_or_404(UserAccount, id=user_id, role=UserRole.INTERN)

    if request.method == "GET":
        if not can_view_intern_profile(actor, intern):
            return json_error("You do not have permission to view this profile.", status=403)

        return JsonResponse(
            {
                "message": "Intern profile fetched successfully.",
                "data": user_profile_to_dict(intern, viewer=actor),
            }
        )

    if request.method in {"PUT", "PATCH"}:
        if not can_edit_intern(actor, intern):
            return json_error("You do not have permission to edit this profile.", status=403)

        try:
            payload = parse_json_body(request)
            validate_onboarding_payload(payload, partial=True)
        except ValueError as exc:
            return json_error(str(exc))

        editable_fields = ["name", "education", "certification", "contact_no", "email", "intern_id"]
        for field in editable_fields:
            if field not in payload:
                continue

            value = str(payload[field]).strip()
            if field == "email":
                value = value.lower()
            setattr(intern, field, value)

        try:
            intern.save()
        except IntegrityError:
            return json_error("An intern with the same email or intern_id already exists.")

        return JsonResponse(
            {
                "message": "Intern profile updated successfully.",
                "data": user_profile_to_dict(intern, viewer=actor),
            }
        )

    if request.method == "DELETE":
        if not can_delete_intern(actor, intern):
            return json_error("You do not have permission to delete this profile.", status=403)

        intern.delete()
        return JsonResponse({"message": "Intern profile deleted successfully."})

    return json_error("Method not allowed.", status=405)


@csrf_exempt
@auth_required(roles=[UserRole.ADMIN, UserRole.MANAGER])
def generate_password_view(request, user_id):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    intern = get_object_or_404(UserAccount, id=user_id, role=UserRole.INTERN)
    temporary_password = intern.generate_random_password()
    intern.save(update_fields=["password", "password_ready", "must_change_password", "last_password_generated_at"])
    create_notification(
        recipient=intern,
        actor=request.auth_user,
        notification_type=Notification.NotificationType.PASSWORD_GENERATED,
        title="Temporary password generated",
        message=f"{request.auth_user.name} generated your temporary password.",
        entity_type="intern",
        entity_id=intern.id,
    )

    return JsonResponse(
        {
            "message": "Temporary password generated successfully.",
            "data": {
                "intern_id": intern.id,
                "email": intern.email,
                "temporary_password": temporary_password,
                "must_change_password": intern.must_change_password,
            },
        }
    )


@csrf_exempt
@auth_required()
def profile_view(request):
    if request.method != "GET":
        return json_error("Method not allowed.", status=405)

    return JsonResponse(
        {
            "message": "Profile fetched successfully.",
            "data": user_profile_to_dict(request.auth_user, viewer=request.auth_user),
        }
    )


@csrf_exempt
@auth_required()
def user_profile_detail_view(request, user_id):
    if request.method != "GET":
        return json_error("Method not allowed.", status=405)

    actor = request.auth_user
    target_user = get_object_or_404(UserAccount, id=user_id)
    if not can_view_user_profile(actor, target_user):
        return json_error("You do not have permission to view this user profile.", status=403)

    return JsonResponse(
        {
            "message": "User profile fetched successfully.",
            "data": user_profile_to_dict(target_user, viewer=actor),
        }
    )
