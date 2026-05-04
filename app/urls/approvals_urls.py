from django.urls import path

from app.views.approvals_views import approval_collection_view, approval_review_view

urlpatterns = [
    path("", approval_collection_view, name="approval-collection"),
    path("<int:approval_id>/review/", approval_review_view, name="approval-review"),
]
