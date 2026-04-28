def can_view_notification(user, notification):
    return notification.recipient_id == user.id
