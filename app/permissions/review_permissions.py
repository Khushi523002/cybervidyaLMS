from app.models.onboard_models import UserRole


def can_create_review(user):
    return user.role == UserRole.MANAGER


def can_view_review(user, review):
    return (
        user.role == UserRole.ADMIN
        or review.manager_id == user.id
        or review.intern_id == user.id
    )


def can_edit_review(user, review):
    return user.role == UserRole.MANAGER and review.manager_id == user.id
