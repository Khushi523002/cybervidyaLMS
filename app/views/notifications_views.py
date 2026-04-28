from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from app.authentication import auth_required, json_error
from app.models import Notification
from app.permissions.notifications_permissions import can_view_notification
from app.serializers.notifications_serializers import notification_to_dict


@csrf_exempt
@auth_required()
def notification_collection_view(request):
    if request.method != "GET":
        return json_error("Method not allowed.", status=405)

    notifications = Notification.objects.select_related("actor").filter(recipient=request.auth_user)
    unread_only = request.GET.get("unread_only")
    if unread_only and unread_only.lower() in {"1", "true", "yes"}:
        notifications = notifications.filter(is_read=False)

    return JsonResponse(
        {
            "message": "Notifications fetched successfully.",
            "data": [notification_to_dict(notification) for notification in notifications],
        }
    )


@csrf_exempt
@auth_required()
def notification_mark_read_view(request, notification_id):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    notification = get_object_or_404(Notification.objects.select_related("actor"), id=notification_id)
    if not can_view_notification(request.auth_user, notification):
        return json_error("You do not have permission to update this notification.", status=403)

    notification.is_read = True
    notification.save(update_fields=["is_read"])
    return JsonResponse({"message": "Notification marked as read.", "data": notification_to_dict(notification)})


@csrf_exempt
@auth_required()
def notification_mark_all_read_view(request):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    Notification.objects.filter(recipient=request.auth_user, is_read=False).update(is_read=True)
    return JsonResponse({"message": "All notifications marked as read."})
