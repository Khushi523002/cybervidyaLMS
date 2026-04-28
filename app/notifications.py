from app.models import Notification, UserAccount
from app.models.onboard_models import UserRole


def create_notification(recipient, notification_type, title, message, actor=None, entity_type="", entity_id=None):
    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )


def notify_roles(role_names, notification_type, title, message, actor=None, entity_type="", entity_id=None):
    recipients = UserAccount.objects.filter(role__in=role_names, is_active=True)
    notifications = []
    for recipient in recipients:
        if actor and recipient.id == actor.id:
            continue
        notifications.append(
            Notification(
                recipient=recipient,
                actor=actor,
                notification_type=notification_type,
                title=title,
                message=message,
                entity_type=entity_type,
                entity_id=entity_id,
            )
        )

    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_admins_and_managers(notification_type, title, message, actor=None, entity_type="", entity_id=None):
    notify_roles(
        [UserRole.ADMIN, UserRole.MANAGER],
        notification_type=notification_type,
        title=title,
        message=message,
        actor=actor,
        entity_type=entity_type,
        entity_id=entity_id,
    )
