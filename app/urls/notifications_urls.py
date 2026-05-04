from django.urls import path

from app.views.notifications_views import (
    notification_collection_view,
    notification_mark_all_read_view,
    notification_mark_read_view,
)

urlpatterns = [
    path("", notification_collection_view, name="notification-collection"),
    path("read-all/", notification_mark_all_read_view, name="notification-read-all"),
    path("<int:notification_id>/read/", notification_mark_read_view, name="notification-read"),
]
