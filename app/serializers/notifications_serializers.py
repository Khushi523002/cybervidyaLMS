def notification_to_dict(notification):
    return {
        "id": notification.id,
        "notification_type": notification.notification_type,
        "title": notification.title,
        "message": notification.message,
        "entity_type": notification.entity_type,
        "entity_id": notification.entity_id,
        "is_read": notification.is_read,
        "actor_id": notification.actor_id,
        "actor_name": notification.actor.name if notification.actor else None,
        "actor_email": notification.actor.email if notification.actor else None,
        "created_at": notification.created_at.isoformat(),
    }
