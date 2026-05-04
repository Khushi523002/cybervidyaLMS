from django.urls import path

from app.views.login_views import change_password_view, login_view, logout_view
from app.views.onboard_views import profile_view, user_profile_detail_view

urlpatterns = [
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("change-password/", change_password_view, name="change-password"),
    path("profile/", profile_view, name="profile"),
    path("users/<int:user_id>/profile/", user_profile_detail_view, name="user-profile-detail"),
]
