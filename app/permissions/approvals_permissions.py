from app.models.onboard_models import UserRole


def can_submit_approval(user):
    return user.role == UserRole.INTERN


def can_review_approval(user):
    return user.role in {UserRole.ADMIN, UserRole.MANAGER}

