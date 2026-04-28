from app.models.onboard_models import UserRole


def can_manage_interns(user):
    return user.role in {UserRole.ADMIN, UserRole.MANAGER}


def can_view_intern_profile(user, target_user):
    return can_manage_interns(user) or user.id == target_user.id


def can_view_user_profile(user, target_user):
    if user.role == UserRole.ADMIN:
        return True
    if user.id == target_user.id:
        return True
    if user.role == UserRole.MANAGER and target_user.role == UserRole.INTERN:
        return True
    return False


def can_edit_intern(user, target_user):
    if can_manage_interns(user):
        return True
    return user.role == UserRole.INTERN and user.id == target_user.id and user.intern_can_edit


def can_delete_intern(user, target_user):
    if can_manage_interns(user):
        return True
    return user.role == UserRole.INTERN and user.id == target_user.id and user.intern_can_delete
