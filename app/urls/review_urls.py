from django.urls import path

from app.views.review_views import (
    review_collection_view,
    review_detail_view,
    review_section_create_view,
    review_section_update_view,
)

urlpatterns = [
    path("communication/", review_section_create_view, {"section": "communication"}, name="review-communication-create"),
    path("technical/", review_section_create_view, {"section": "technical"}, name="review-technical-create"),
    path("", review_collection_view, name="review-collection"),
    path(
        "<int:review_id>/communication/",
        review_section_update_view,
        {"section": "communication"},
        name="review-communication-update",
    ),
    path(
        "<int:review_id>/technical/",
        review_section_update_view,
        {"section": "technical"},
        name="review-technical-update",
    ),
    path("<int:review_id>/", review_detail_view, name="review-detail"),
]
