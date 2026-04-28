from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from app.authentication import auth_required, json_error, parse_json_body
from app.models import UserToken
from app.serializers.login__serializers import login_response


@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    try:
        payload = parse_json_body(request)
    except ValueError as exc:
        return json_error(str(exc))

    email = str(payload.get("email") or payload.get("user_email") or payload.get("userEmail") or "").strip().lower()
    password = payload.get("password", "")
    if not email or not password:
        return json_error("email and password are required.")

    user = authenticate(request, email=email, password=password)
    if user is None:
        return json_error("Invalid email or password.", status=401)

    token = UserToken.issue_for_user(user)
    return JsonResponse(
        {
            "message": "Login successful.",
            "data": login_response(user, token),
        }
    )


@csrf_exempt
@auth_required()
def logout_view(request):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    request.auth_token.delete()
    return JsonResponse({"message": "Logout successful."})


@csrf_exempt
@auth_required()
def change_password_view(request):
    if request.method != "POST":
        return json_error("Method not allowed.", status=405)

    try:
        payload = parse_json_body(request)
    except ValueError as exc:
        return json_error(str(exc))

    current_password = payload.get("current_password", "")
    new_password = payload.get("new_password", "")
    if not current_password or not new_password:
        return json_error("current_password and new_password are required.")

    user = request.auth_user
    if not user.check_password(current_password):
        return json_error("Current password is incorrect.", status=400)

    user.set_password(new_password)
    user.must_change_password = False
    user.password_ready = True
    user.save(update_fields=["password", "must_change_password", "password_ready", "updated_at"])

    user.tokens.all().delete()
    return JsonResponse({"message": "Password changed successfully. Please login again."})
