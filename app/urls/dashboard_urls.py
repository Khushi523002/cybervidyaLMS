from django.urls import path

from app.views.dashboard_views import dashboard_overview_view, intern_dashboard_list_view

urlpatterns = [
    path("overview/", dashboard_overview_view, name="dashboard-overview"),
    path("interns/", intern_dashboard_list_view, name="dashboard-intern-list"),
]
