from django.urls import path

from app.views.onboard_views import generate_password_view, intern_collection_view, intern_detail_view

urlpatterns = [
    path("interns/", intern_collection_view, name="intern-collection"),
    path("interns/<int:user_id>/", intern_detail_view, name="intern-detail"),
    path("interns/<int:user_id>/generate-password/", generate_password_view, name="intern-generate-password"),
]
