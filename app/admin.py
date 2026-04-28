from django.contrib import admin

from app.models import ApprovalRequest, Notification, Review, UserAccount, UserToken


@admin.register(UserAccount)
class UserAccountAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "role", "intern_id", "is_active", "password_ready")
    list_filter = ("role", "is_active", "password_ready")
    search_fields = ("email", "name", "intern_id")


@admin.register(UserToken)
class UserTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "key", "created_at", "last_used_at")
    search_fields = ("user__email", "key")


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ("requester", "request_type", "status", "reviewed_by", "created_at")
    list_filter = ("request_type", "status")
    search_fields = ("requester__email", "requester__intern_id", "reason")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("intern", "manager", "communication_rating", "technical_rating", "created_at")
    list_filter = ("communication_rating", "technical_rating")
    search_fields = ("intern__email", "intern__intern_id", "manager__email")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "notification_type", "title", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")
    search_fields = ("recipient__email", "title", "message")
