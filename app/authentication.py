import json
from functools import wraps

from django.http import JsonResponse
from django.utils import timezone

from app.models import UserToken


def json_error(message, status=400, extra=None):
    payload = {"message": message}
    if extra:
        payload.update(extra)
    return JsonResponse(payload, status=status)


def parse_json_body(request):
    if not request.body:
        return {}

    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must be valid JSON.") from exc


def get_bearer_token(request):
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1].strip()


def get_authenticated_user(request):
    token_key = get_bearer_token(request)
    if not token_key:
        return None, None

    token = (
        UserToken.objects.select_related("user")
        .filter(key=token_key, user__is_active=True)
        .first()
    )
    if token is None:
        return None, None

    token.last_used_at = timezone.now()
    token.save(update_fields=["last_used_at"])
    return token.user, token


def auth_required(roles=None):
    allowed_roles = set(roles or [])

    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            user, token = get_authenticated_user(request)
            if user is None:
                return json_error("Authentication credentials were not provided or are invalid.", status=401)

            if allowed_roles and user.role not in allowed_roles:
                return json_error("You do not have permission to perform this action.", status=403)

            request.auth_user = user
            request.auth_token = token
            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator

