from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from app.authentication import auth_required, json_error, parse_json_body
from app.models import ApprovalRequest
from app.models.notifications_models import Notification
from app.notifications import create_notification, notify_admins_and_managers
from app.permissions.approvals_permissions import can_review_approval, can_submit_approval
from app.serializers.approvals_serializers import (
    approval_to_dict,
    validate_approval_request_payload,
    validate_approval_review_payload,
)


@csrf_exempt
@auth_required()
def approval_collection_view(request):
    user = request.auth_user

    if request.method == "GET":
        queryset = ApprovalRequest.objects.select_related("requester", "reviewed_by")
        if can_review_approval(user):
            queryset = queryset.all()
        else:
            queryset = queryset.filter(requester=user)

        return JsonResponse(
            {
                "message": "Approval requests fetched successfully.",
                "data": [approval_to_dict(approval) for approval in queryset],
            }
        )

    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    if not can_submit_approval(user):
        return json_error("Only intern users can submit approval requests.", status=403)

    try:
        payload = parse_json_body(request)
        validate_approval_request_payload(payload)
    except ValueError as exc:
        return json_error(str(exc))

    approval = ApprovalRequest.objects.create(
        requester=user,
        request_type=payload["request_type"],
        reason=payload["reason"].strip(),
    )
    notify_admins_and_managers(
        notification_type=Notification.NotificationType.APPROVAL_REQUESTED,
        title="New approval request submitted",
        message=f"{user.name} requested {approval.request_type} permission.",
        actor=user,
        entity_type="approval",
        entity_id=approval.id,
    )
    return JsonResponse(
        {
            "message": "Approval request created successfully.",
            "data": approval_to_dict(approval),
        },
        status=201,
    )


@csrf_exempt
@auth_required()
def approval_review_view(request, approval_id):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    reviewer = request.auth_user
    if not can_review_approval(reviewer):
        return json_error("Only admin and manager users can review approval requests.", status=403)

    approval = get_object_or_404(
        ApprovalRequest.objects.select_related("requester", "reviewed_by"),
        id=approval_id,
    )
    if approval.status != ApprovalRequest.Status.PENDING:
        return json_error("Only pending approval requests can be reviewed.")

    try:
        payload = parse_json_body(request)
        validate_approval_review_payload(payload)
    except ValueError as exc:
        return json_error(str(exc))

    review_notes = str(payload.get("review_notes", "")).strip()
    approval.apply_decision(reviewer=reviewer, status=payload["status"], review_notes=review_notes)
    create_notification(
        recipient=approval.requester,
        actor=reviewer,
        notification_type=Notification.NotificationType.APPROVAL_REVIEWED,
        title="Approval request reviewed",
        message=f"{reviewer.name} marked your {approval.request_type} request as {approval.status}.",
        entity_type="approval",
        entity_id=approval.id,
    )

    return JsonResponse(
        {
            "message": "Approval request reviewed successfully.",
            "data": approval_to_dict(approval),
        }
    )
