from django.urls import include, path

urlpatterns = [
    path("auth/", include("app.urls.login_urls")),
    path("onboarding/", include("app.urls.onboard_urls")),
    path("dashboard/", include("app.urls.dashboard_urls")),
    path("approvals/", include("app.urls.approvals_urls")),
    path("reviews/", include("app.urls.review_urls")),
    path("notifications/", include("app.urls.notifications_urls")),
]
