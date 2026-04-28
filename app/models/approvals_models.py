from django.db import models
from django.utils import timezone

from app.models.onboard_models import UserAccount


class ApprovalRequest(models.Model):
    class RequestType(models.TextChoices):
        EDIT = "edit", "Edit Permission"
        DELETE = "delete", "Delete Permission"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    requester = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="approval_requests",
        limit_choices_to={"role": "intern"},
    )
    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        UserAccount,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_approval_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.requester.email} - {self.request_type} - {self.status}"

    def apply_decision(self, reviewer, status, review_notes=""):
        self.status = status
        self.review_notes = review_notes
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "review_notes", "reviewed_by", "reviewed_at", "updated_at"])

        if status == self.Status.APPROVED:
            if self.request_type == self.RequestType.EDIT:
                self.requester.intern_can_edit = True
                self.requester.save(update_fields=["intern_can_edit", "updated_at"])
            elif self.request_type == self.RequestType.DELETE:
                self.requester.intern_can_delete = True
                self.requester.save(update_fields=["intern_can_delete", "updated_at"])
