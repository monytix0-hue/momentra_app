from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from app.core.supabase import get_supabase
from app.dependencies import get_current_user_email, get_current_user_id
from app.schemas.business import (
    BusinessActivityOut,
    BusinessControlSummaryOut,
    BusinessCostCenterBreakdownOut,
    BusinessInviteAcceptBody,
    BusinessInviteAcceptOut,
    BusinessInviteOut,
    BusinessInvitePreviewOut,
    BusinessInsightsOut,
    BusinessInviteSendBody,
    BusinessInviteSendOut,
    BusinessCostCenterCreate,
    BusinessCostCenterOut,
    BusinessDashboardOut,
    BusinessMemberCreate,
    BusinessMemberOut,
    BusinessMemberUpdate,
    BusinessRejectBody,
    BusinessRecommendationOut,
    BusinessSignalOut,
    BusinessSpendCreate,
    BusinessSpendOut,
    BusinessTodayOut,
    BusinessUnitCreate,
    BusinessUnitPerformanceResponseOut,
    BusinessUnitOut,
    BusinessVendorCreate,
    BusinessVendorOut,
    BusinessWorkspaceCreate,
    BusinessWorkspaceOut,
    BusinessWorkspaceUpdate,
)
from app.services import business_service

router = APIRouter(prefix="/business", tags=["business"])


def _sb() -> Any:
    try:
        return get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e


def _http_from_service_err(e: Exception) -> HTTPException:
    if isinstance(e, PermissionError):
        code = str(e) or "forbidden"
        if code == "not_a_member":
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a workspace member")
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if isinstance(e, ValueError):
        msg = str(e) or "bad_request"
        if msg in {"workspace_not_found", "spend_not_found", "member_not_found", "not_found"}:
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        if msg == "invite_not_found":
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found or expired")
        if msg == "rejection_reason_required":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is required")
        if msg == "invalid_spend_status":
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This spend is no longer pending; refresh and review latest status",
            )
        if msg == "purchase_fields_incomplete":
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide both price per unit and quantity, or send total amount",
            )
        if msg == "amount_or_purchase_required":
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide total amount, or provide price per unit with quantity",
            )
        if msg == "amount_mismatch":
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Total amount must equal price per unit × quantity",
            )
        if msg in {"amount_negative", "purchase_fields_negative"}:
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amounts and quantity must be non-negative",
            )
        if msg == "invalid_invite_email":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite email is invalid")
        if msg == "email_mismatch":
            return HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sign in with the email this invite was sent to",
            )
        if msg == "email_required_for_invite":
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account must have an email to accept this invite",
            )
        if msg == "email_send_failed":
            return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not send invite email")
        if msg == "invalid_token":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite link")
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/workspaces", response_model=BusinessWorkspaceOut)
def post_workspace(
    body: BusinessWorkspaceCreate, user_id: str = Depends(get_current_user_id)
) -> BusinessWorkspaceOut:
    sb = _sb()
    try:
        row = business_service.create_workspace(sb, user_id, body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessWorkspaceOut.model_validate(row)


@router.get("/workspaces", response_model=list[BusinessWorkspaceOut])
def get_workspaces(
    include_archived: bool = Query(default=False),
    user_id: str = Depends(get_current_user_id),
) -> list[BusinessWorkspaceOut]:
    sb = _sb()
    try:
        rows = business_service.list_workspaces(sb, user_id, include_archived=include_archived)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessWorkspaceOut.model_validate(r) for r in rows]


@router.get("/workspaces/{workspace_id}", response_model=BusinessWorkspaceOut)
def get_workspace(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessWorkspaceOut:
    sb = _sb()
    try:
        row = business_service.get_workspace(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessWorkspaceOut.model_validate(row)


@router.patch("/workspaces/{workspace_id}", response_model=BusinessWorkspaceOut)
def patch_workspace(
    workspace_id: UUID,
    body: BusinessWorkspaceUpdate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessWorkspaceOut:
    sb = _sb()
    try:
        row = business_service.update_workspace(sb, user_id, str(workspace_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessWorkspaceOut.model_validate(row)


@router.post("/workspaces/{workspace_id}/archive", response_model=BusinessWorkspaceOut)
def post_archive_workspace(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessWorkspaceOut:
    sb = _sb()
    try:
        row = business_service.archive_workspace(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessWorkspaceOut.model_validate(row)


@router.post("/workspaces/{workspace_id}/units", response_model=BusinessUnitOut)
def post_unit(
    workspace_id: UUID,
    body: BusinessUnitCreate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessUnitOut:
    sb = _sb()
    try:
        row = business_service.create_unit(sb, user_id, str(workspace_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessUnitOut.model_validate(row)


@router.get("/workspaces/{workspace_id}/units", response_model=list[BusinessUnitOut])
def get_units(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessUnitOut]:
    sb = _sb()
    try:
        rows = business_service.list_units(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessUnitOut.model_validate(r) for r in rows]


@router.post("/workspaces/{workspace_id}/members", response_model=BusinessMemberOut)
def post_member(
    workspace_id: UUID,
    body: BusinessMemberCreate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessMemberOut:
    sb = _sb()
    try:
        row = business_service.create_member(sb, user_id, str(workspace_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessMemberOut.model_validate(row)


@router.patch("/workspaces/{workspace_id}/members/{member_id}", response_model=BusinessMemberOut)
def patch_member(
    workspace_id: UUID,
    member_id: UUID,
    body: BusinessMemberUpdate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessMemberOut:
    sb = _sb()
    try:
        row = business_service.update_member(sb, user_id, str(workspace_id), str(member_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessMemberOut.model_validate(row)


@router.get("/workspaces/{workspace_id}/members", response_model=list[BusinessMemberOut])
def get_members(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessMemberOut]:
    sb = _sb()
    try:
        rows = business_service.list_members(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessMemberOut.model_validate(r) for r in rows]


@router.post("/workspaces/{workspace_id}/invites", response_model=BusinessInviteSendOut)
def post_member_invite(
    workspace_id: UUID,
    body: BusinessInviteSendBody,
    user_id: str = Depends(get_current_user_id),
) -> BusinessInviteSendOut:
    sb = _sb()
    try:
        row = business_service.send_member_invite(
            sb,
            user_id,
            str(workspace_id),
            email=body.email,
            role=body.role,
            unit_id=str(body.unit_id) if body.unit_id else None,
        )
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessInviteSendOut.model_validate(
        {
            "invite_id": row["invite_id"],
            "workspace_id": row["workspace_id"],
            "email": row["email"],
            "role": row["role"],
            "unit_id": row.get("unit_id"),
            "join_url": row["join_url"],
            "sent": row.get("sent", False),
            "message": row.get("message"),
            "created_at": row.get("created_at"),
        }
    )


@router.get("/workspaces/{workspace_id}/invites", response_model=list[BusinessInviteOut])
def get_member_invites(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessInviteOut]:
    sb = _sb()
    try:
        rows = business_service.list_member_invites(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessInviteOut.model_validate(r) for r in rows]


@router.get("/invites/preview", response_model=BusinessInvitePreviewOut)
def get_invite_preview(token: str = Query(..., min_length=8)) -> BusinessInvitePreviewOut:
    sb = _sb()
    try:
        row = business_service.preview_member_invite(sb, token)
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessInvitePreviewOut.model_validate(row)


@router.post("/invites/accept", response_model=BusinessInviteAcceptOut)
def post_invite_accept(
    body: BusinessInviteAcceptBody,
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
) -> BusinessInviteAcceptOut:
    sb = _sb()
    try:
        row = business_service.accept_member_invite(sb, user_id, user_email, body.token)
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessInviteAcceptOut.model_validate(row)


@router.post("/workspaces/{workspace_id}/cost-centers", response_model=BusinessCostCenterOut)
def post_cost_center(
    workspace_id: UUID,
    body: BusinessCostCenterCreate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessCostCenterOut:
    sb = _sb()
    try:
        row = business_service.create_cost_center(sb, user_id, str(workspace_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessCostCenterOut.model_validate(row)


@router.get("/workspaces/{workspace_id}/cost-centers", response_model=list[BusinessCostCenterOut])
def get_cost_centers(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessCostCenterOut]:
    sb = _sb()
    try:
        rows = business_service.list_cost_centers(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessCostCenterOut.model_validate(r) for r in rows]


@router.post("/workspaces/{workspace_id}/vendors", response_model=BusinessVendorOut)
def post_vendor(
    workspace_id: UUID,
    body: BusinessVendorCreate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessVendorOut:
    sb = _sb()
    try:
        row = business_service.create_vendor(sb, user_id, str(workspace_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessVendorOut.model_validate(row)


@router.get("/workspaces/{workspace_id}/vendors", response_model=list[BusinessVendorOut])
def get_vendors(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessVendorOut]:
    sb = _sb()
    try:
        rows = business_service.list_vendors(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessVendorOut.model_validate(r) for r in rows]


@router.post("/workspaces/{workspace_id}/spends", response_model=BusinessSpendOut)
def post_spend(
    workspace_id: UUID,
    body: BusinessSpendCreate,
    user_id: str = Depends(get_current_user_id),
) -> BusinessSpendOut:
    sb = _sb()
    try:
        row = business_service.submit_spend(sb, user_id, str(workspace_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessSpendOut.model_validate(row)


@router.get("/workspaces/{workspace_id}/spends", response_model=list[BusinessSpendOut])
def get_spends(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessSpendOut]:
    sb = _sb()
    try:
        rows = business_service.list_spends(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessSpendOut.model_validate(r) for r in rows]


@router.post("/spends/{spend_id}/approve", response_model=BusinessSpendOut)
def post_approve_spend(
    spend_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessSpendOut:
    sb = _sb()
    try:
        row = business_service.approve_spend(sb, user_id, str(spend_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessSpendOut.model_validate(row)


@router.post("/spends/{spend_id}/reject", response_model=BusinessSpendOut)
def post_reject_spend(
    spend_id: UUID,
    body: BusinessRejectBody,
    user_id: str = Depends(get_current_user_id),
) -> BusinessSpendOut:
    sb = _sb()
    try:
        row = business_service.reject_spend(sb, user_id, str(spend_id), body.reason)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessSpendOut.model_validate(row)


@router.get("/workspaces/{workspace_id}/dashboard", response_model=BusinessDashboardOut)
def get_dashboard(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessDashboardOut:
    sb = _sb()
    try:
        raw = business_service.dashboard(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessDashboardOut.model_validate(raw)


@router.get("/workspaces/{workspace_id}/signals", response_model=list[BusinessSignalOut])
def get_signals(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessSignalOut]:
    sb = _sb()
    try:
        rows = business_service.list_signals(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessSignalOut.model_validate(r) for r in rows]


@router.get("/workspaces/{workspace_id}/today", response_model=BusinessTodayOut)
def get_today(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessTodayOut:
    sb = _sb()
    try:
        raw = business_service.compute_today_status(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessTodayOut.model_validate(raw)


@router.get("/workspaces/{workspace_id}/control-summary", response_model=BusinessControlSummaryOut)
def get_control_summary(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessControlSummaryOut:
    sb = _sb()
    try:
        raw = business_service.compute_control_summary(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessControlSummaryOut.model_validate(raw)


@router.get("/workspaces/{workspace_id}/recommendations", response_model=list[BusinessRecommendationOut])
def get_recommendations(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessRecommendationOut]:
    sb = _sb()
    try:
        rows = business_service.generate_business_recommendations(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessRecommendationOut.model_validate(r) for r in rows]


@router.get("/workspaces/{workspace_id}/unit-performance", response_model=BusinessUnitPerformanceResponseOut)
def get_unit_performance(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessUnitPerformanceResponseOut:
    sb = _sb()
    try:
        raw = business_service.compute_unit_performance_response(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessUnitPerformanceResponseOut.model_validate(raw)


@router.get(
    "/workspaces/{workspace_id}/cost-center-breakdown",
    response_model=list[BusinessCostCenterBreakdownOut],
)
def get_cost_center_breakdown(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> list[BusinessCostCenterBreakdownOut]:
    sb = _sb()
    try:
        rows = business_service.compute_cost_center_breakdown(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessCostCenterBreakdownOut.model_validate(r) for r in rows]


@router.get("/workspaces/{workspace_id}/insights", response_model=BusinessInsightsOut)
def get_insights(
    workspace_id: UUID, user_id: str = Depends(get_current_user_id)
) -> BusinessInsightsOut:
    sb = _sb()
    try:
        raw = business_service.compute_business_insights(sb, user_id, str(workspace_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return BusinessInsightsOut.model_validate(raw)


@router.get("/workspaces/{workspace_id}/activity", response_model=list[BusinessActivityOut])
def get_activity(
    workspace_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
) -> list[BusinessActivityOut]:
    sb = _sb()
    try:
        _ = business_service.get_workspace(sb, user_id, str(workspace_id))
        rows = (
            sb.table("business_activity")
            .select("*")
            .eq("workspace_id", str(workspace_id))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
            or []
        )
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [BusinessActivityOut.model_validate(r) for r in rows]

