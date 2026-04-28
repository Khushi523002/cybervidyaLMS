from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from app.models.onboard_models import UserAccount


class Review(models.Model):
    intern = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="received_reviews",
        limit_choices_to={"role": "intern"},
    )
    manager = models.ForeignKey(
        UserAccount,
        on_delete=models.CASCADE,
        related_name="given_reviews",
        limit_choices_to={"role": "manager"},
    )
    communication_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    communication_comment = models.TextField(blank=True)
    technical_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    technical_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.intern.email} reviewed by {self.manager.email}"

    @property
    def average_rating(self):
        ratings = [rating for rating in (self.communication_rating, self.technical_rating) if rating is not None]
        if not ratings:
            return None
        return round(sum(ratings) / len(ratings), 2)

    @property
    def communication_submitted(self):
        return self.communication_rating is not None and bool(self.communication_comment.strip())

    @property
    def technical_submitted(self):
        return self.technical_rating is not None and bool(self.technical_comment.strip())

    @property
    def is_complete(self):
        return self.communication_submitted and self.technical_submitted
