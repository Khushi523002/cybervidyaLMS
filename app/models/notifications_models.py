from django.db import models

from app.models.onboard_models import UserAccount


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        ONBOARDING_CREATED = "onboarding_created", "Onboarding Created"
        PASSWORD_GENERATED = "password_generated", "Password Generated"
        APPROVAL_REQUESTED = "approval_requested", "Approval Requested"
        APPROVAL_REVIEWED = "approval_reviewed", "Approval Reviewed"
        REVIEW_CREATED = "review_created", "Review Created"
        REVIEW_UPDATED = "review_updated", "Review Updated"

    recipient = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        UserAccount,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="triggered_notifications",
    )
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id = models.PositiveIntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["is_read", "-created_at"]

    def __str__(self):
        return f"{self.recipient.email} - {self.notification_type}"
