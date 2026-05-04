from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from app.authentication import auth_required, json_error
from app.models import UserAccount
from app.models.onboard_models import UserRole
from app.permissions.dashboard_permissions import can_view_dashboard
from app.serializers.dashboard_serializers import (
    build_admin_dashboard,
    build_intern_dashboard,
    build_manager_dashboard,
    filter_intern_items_by_rating,
    intern_list_item,
    sort_intern_items,
)


@csrf_exempt
@auth_required()
def intern_dashboard_list_view(request):
    if request.method != "GET":
        return json_error("Method not allowed.", status=405)

    user = request.auth_user
    if not can_view_dashboard(user):
        return json_error("You do not have permission to view the dashboard.", status=403)

    interns = UserAccount.objects.filter(role=UserRole.INTERN).prefetch_related("received_reviews").order_by("-date_joined")

    min_rating = request.GET.get("min_review_rating")
    max_rating = request.GET.get("max_review_rating")
    try:
        min_rating_value = float(min_rating) if min_rating else None
        max_rating_value = float(max_rating) if max_rating else None
    except ValueError:
        return json_error("min_review_rating and max_review_rating must be numeric values.")

    items = [intern_list_item(intern) for intern in interns]

    if user.role == UserRole.ADMIN:
        items = filter_intern_items_by_rating(items, min_rating=min_rating_value, max_rating=max_rating_value)
    elif user.role == UserRole.INTERN:
        items = [item for item in items if item["id"] == user.id]

    items = sort_intern_items(items)
    return JsonResponse(
        {
            "message": "Dashboard intern list fetched successfully.",
            "data": items,
        }
    )


@csrf_exempt
@auth_required()
def dashboard_overview_view(request):
    if request.method != "GET":
        return json_error("Method not allowed.", status=405)

    user = request.auth_user
    if not can_view_dashboard(user):
        return json_error("You do not have permission to view the dashboard.", status=403)

    interns = list(UserAccount.objects.filter(role=UserRole.INTERN).prefetch_related("received_reviews").order_by("-date_joined"))
    min_rating = request.GET.get("min_review_rating")
    max_rating = request.GET.get("max_review_rating")
    try:
        min_rating_value = float(min_rating) if min_rating else None
        max_rating_value = float(max_rating) if max_rating else None
    except ValueError:
        return json_error("min_review_rating and max_review_rating must be numeric values.")

    if user.role == UserRole.ADMIN:
        data = build_admin_dashboard(user, interns)
        data["interns"] = filter_intern_items_by_rating(
            data["interns"], min_rating=min_rating_value, max_rating=max_rating_value
        )
        data["interns"] = sort_intern_items(data["interns"])
        data["stats"]["total_interns"] = len(data["interns"])
        return JsonResponse({"message": "Admin dashboard fetched successfully.", "data": data})

    if user.role == UserRole.MANAGER:
        data = build_manager_dashboard(user, interns)
        return JsonResponse({"message": "Manager dashboard fetched successfully.", "data": data})

    data = build_intern_dashboard(user)
    return JsonResponse({"message": "Intern dashboard fetched successfully.", "data": data})
