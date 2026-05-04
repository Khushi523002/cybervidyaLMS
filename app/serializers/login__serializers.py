from app.serializers.onboard_Serializers import user_to_dict


def login_response(user, token):
    return {
        "token": token.key,
        "user": user_to_dict(user),
    }
