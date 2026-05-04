from app.models.approvals_models import ApprovalRequest


def validate_approval_request_payload(payload):
    request_type = payload.get("request_type")
    reason = str(payload.get("reason", "")).strip()

    allowed_types = {ApprovalRequest.RequestType.EDIT, ApprovalRequest.RequestType.DELETE}
    if request_type not in allowed_types:
        raise ValueError("request_type must be either 'edit' or 'delete'.")

    if not reason:
        raise ValueError("reason is required.")


def validate_approval_review_payload(payload):
    status = payload.get("status")
    allowed_statuses = {ApprovalRequest.Status.APPROVED, ApprovalRequest.Status.REJECTED}
    if status not in allowed_statuses:
        raise ValueError("status must be either 'approved' or 'rejected'.")


def approval_to_dict(approval):
    return {
        "id": approval.id,
        "requester_id": approval.requester_id,
        "requester_email": approval.requester.email,
        "requester_name": approval.requester.name,
        "requester_intern_id": approval.requester.intern_id,
        "request_type": approval.request_type,
        "reason": approval.reason,
        "status": approval.status,
        "review_notes": approval.review_notes,
        "reviewed_by_id": approval.reviewed_by_id,
        "reviewed_by_email": approval.reviewed_by.email if approval.reviewed_by else None,
        "reviewed_at": approval.reviewed_at.isoformat() if approval.reviewed_at else None,
        "created_at": approval.created_at.isoformat(),
        "updated_at": approval.updated_at.isoformat(),
    }
