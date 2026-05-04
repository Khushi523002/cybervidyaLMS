from app.models.review_models import Review


def validate_review_payload(payload, partial=False):
    if not partial:
        if payload.get("intern_user_id") in (None, "") and payload.get("intern_id") in (None, ""):
            raise ValueError("Either intern_user_id or intern_id is required.")

    has_communication_rating = payload.get("communication_rating") not in (None, "")
    has_communication_comment = payload.get("communication_comment") not in (None, "")
    has_technical_rating = payload.get("technical_rating") not in (None, "")
    has_technical_comment = payload.get("technical_comment") not in (None, "")

    if not partial and not (
        (has_communication_rating and has_communication_comment)
        or (has_technical_rating and has_technical_comment)
    ):
        raise ValueError(
            "Provide communication_rating with communication_comment, technical_rating with technical_comment, or both."
        )

    if has_communication_rating != has_communication_comment:
        raise ValueError("communication_rating and communication_comment must be submitted together.")

    if has_technical_rating != has_technical_comment:
        raise ValueError("technical_rating and technical_comment must be submitted together.")

    for rating_field in ("communication_rating", "technical_rating"):
        if rating_field not in payload:
            continue

        try:
            rating_value = int(payload[rating_field])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{rating_field} must be an integer between 1 and 5.") from exc

        if rating_value < 1 or rating_value > 5:
            raise ValueError(f"{rating_field} must be between 1 and 5.")

    for comment_field in ("communication_comment", "technical_comment"):
        if comment_field in payload and not str(payload[comment_field]).strip():
            raise ValueError(f"{comment_field} cannot be blank.")


def validate_review_section_payload(section, payload, partial=False, require_intern_reference=True):
    rating_field = f"{section}_rating"
    comment_field = f"{section}_comment"

    if not partial:
        if require_intern_reference and payload.get("intern_user_id") in (None, "") and payload.get("intern_id") in (None, ""):
            raise ValueError("Either intern_user_id or intern_id is required.")
        if payload.get(rating_field) in (None, "") or payload.get(comment_field) in (None, ""):
            raise ValueError(f"{rating_field} and {comment_field} are required.")

    if rating_field in payload:
        try:
            rating_value = int(payload[rating_field])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{rating_field} must be an integer between 1 and 5.") from exc
        if rating_value < 1 or rating_value > 5:
            raise ValueError(f"{rating_field} must be between 1 and 5.")

    if comment_field in payload and not str(payload[comment_field]).strip():
        raise ValueError(f"{comment_field} cannot be blank.")


def review_to_dict(review):
    return {
        "id": review.id,
        "intern_user_id": review.intern_id,
        "intern_name": review.intern.name,
        "intern_email": review.intern.email,
        "intern_id": review.intern.intern_id,
        "manager_id": review.manager_id,
        "manager_name": review.manager.name,
        "manager_email": review.manager.email,
        "communication_rating": review.communication_rating,
        "communication_comment": review.communication_comment,
        "technical_rating": review.technical_rating,
        "technical_comment": review.technical_comment,
        "average_rating": review.average_rating,
        "communication_submitted": review.communication_submitted,
        "technical_submitted": review.technical_submitted,
        "is_complete": review.is_complete,
        "created_at": review.created_at.isoformat(),
        "updated_at": review.updated_at.isoformat(),
    }


def review_summary_from_user(user):
    communication_average = getattr(user, "communication_rating_average", None)
    technical_average = getattr(user, "technical_rating_average", None)
    total_reviews = getattr(user, "total_reviews", 0)

    if communication_average is None or technical_average is None:
        reviews = Review.objects.filter(intern=user)
        communication_ratings = [review.communication_rating for review in reviews if review.communication_rating is not None]
        technical_ratings = [review.technical_rating for review in reviews if review.technical_rating is not None]
        total_reviews = reviews.count()
        if communication_ratings or technical_ratings:
            communication_average = (
                round(sum(communication_ratings) / len(communication_ratings), 2)
                if communication_ratings
                else None
            )
            technical_average = (
                round(sum(technical_ratings) / len(technical_ratings), 2)
                if technical_ratings
                else None
            )
            combined = [value for value in (communication_average, technical_average) if value is not None]
            overall_average = round(sum(combined) / len(combined), 2) if combined else None
        else:
            communication_average = None
            technical_average = None
            overall_average = None
    else:
        communication_average = round(float(communication_average), 2) if communication_average is not None else None
        technical_average = round(float(technical_average), 2) if technical_average is not None else None
        combined = [value for value in (communication_average, technical_average) if value is not None]
        overall_average = round(sum(combined) / len(combined), 2) if combined else None

    return {
        "communication_rating_average": communication_average,
        "technical_rating_average": technical_average,
        "overall_rating_average": overall_average,
        "total_reviews": total_reviews,
    }
