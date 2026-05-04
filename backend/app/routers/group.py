from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from app.core.supabase import get_supabase
from app.dependencies import get_current_user_email, get_current_user_id
from app.schemas.group_intelligence import (
    GroupCycleStatusOut,
    GroupHealthRowOut,
    GroupHomeTodayOut,
    GroupIntelligenceRecommendationOut,
    GroupIntelligenceSignalOut,
    GroupIntelligenceSummaryOut,
    GroupMovementOut,
    GroupNudgeOut,
)
from app.schemas.group import (
    GroupActivityOut,
    GroupCommitmentOut,
    GroupCommitmentsBulkCreate,
    GroupCommitmentUpdate,
    GroupCycleCreate,
    GroupCycleOut,
    GroupExpenseCreate,
    GroupExpenseOut,
    GroupHomeOut,
    GroupRecurringApplyBody,
    GroupRecurringApplyOut,
    GroupRecurringExpenseCreate,
    GroupRecurringExpenseOut,
    GroupRecurringExpenseUpdate,
    GroupMomentCreate,
    GroupMomentDetailOut,
    GroupMomentSummaryOut,
    GroupMemberMoneySummaryOut,
    GroupMemberMoneySummaryRow,
    GroupSettlementPlanOut,
    GroupMomentUpdate,
    GroupParticipantCreate,
    GroupParticipantOut,
    GroupParticipantUpdate,
    GroupInviteAcceptBody,
    GroupInviteAcceptOut,
    GroupInvitePreviewOut,
    GroupInviteSendBody,
    GroupInviteSendOut,
    GroupReminderCreate,
    GroupReminderOut,
    GroupPositionOut,
    GroupSettlementCreate,
    GroupSettlementOut,
    GroupSignalOut,
    GroupSummaryBlock,
    PayCommitmentBody,
    PendingCommitmentHomeRow,
)
from app.services import group_intelligence_service, group_service

router = APIRouter(prefix="/group", tags=["group"])


def _sb() -> Any:
    try:
        return get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e


def _http_from_service_err(e: Exception) -> HTTPException:
    if isinstance(e, PermissionError):
        code = str(e) or "forbidden"
        if code == "not_a_member":
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a group member")
        if code == "admin_only":
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
        if code == "admin_or_self":
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if isinstance(e, ValueError):
        msg = str(e) or "bad_request"
        status_c = status.HTTP_400_BAD_REQUEST
        if msg == "group_not_found":
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        if msg == "participant_not_found":
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")
        if msg == "not_found":
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        if msg == "last_admin":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the last admin")
        if msg == "no_cycle":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active cycle for this group")
        if msg == "invalid_token":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite link")
        if msg == "invite_not_found":
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found or expired")
        if msg == "invalid_invite_target":
            return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot invite this participant")
        if msg == "email_mismatch":
            return HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sign in with the email this invite was sent to",
            )
        if msg == "email_required_for_invite":
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invite is tied to an email; your account must have a verified email on the token",
            )
        if msg == "already_member":
            return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member of this group")
        if msg == "email_send_failed":
            return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not send invite email")
        return HTTPException(status_code=status_c, detail=msg)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


def _detail_model(d: dict[str, Any]) -> GroupMomentDetailOut:
    s = d["summary"]
    summary = GroupSummaryBlock(
        collected_amount=s["collected_amount"],
        target_amount=s["target_amount"],
        pending_commitment_count=s["pending_commitment_count"],
        overdue_commitment_count=s["overdue_commitment_count"],
        open_share_debt=s["open_share_debt"],
    )
    parts = [GroupParticipantOut.model_validate(p) for p in d.get("participants") or []]
    cycles = [GroupCycleOut.model_validate(c) for c in d.get("cycles") or []]
    ac = d.get("active_cycle")
    active = GroupCycleOut.model_validate(ac) if ac else None
    base = {k: v for k, v in d.items() if k not in ("summary", "participants", "cycles", "active_cycle")}
    m = GroupMomentSummaryOut.model_validate(base)
    return GroupMomentDetailOut(
        **m.model_dump(),
        summary=summary,
        participants=parts,
        cycles=cycles,
        active_cycle=active,
    )


@router.get("/invites/preview", response_model=GroupInvitePreviewOut)
def get_invite_preview(token: str = Query(..., min_length=8)) -> GroupInvitePreviewOut:
    sb = _sb()
    try:
        raw = group_service.preview_invite_by_token(sb, token)
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupInvitePreviewOut.model_validate(raw)


@router.post("/invites/accept", response_model=GroupInviteAcceptOut)
def post_invite_accept(
    body: GroupInviteAcceptBody,
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
) -> GroupInviteAcceptOut:
    sb = _sb()
    try:
        raw = group_service.accept_group_invite(sb, user_id, user_email, body.token)
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupInviteAcceptOut.model_validate(raw)


@router.get("/home", response_model=GroupHomeOut)
def group_home(user_id: str = Depends(get_current_user_id)) -> GroupHomeOut:
    sb = _sb()
    try:
        raw = group_service.group_home(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupHomeOut(
        trigger_message=raw["trigger_message"],
        trigger_severity=raw["trigger_severity"],
        active_group_count=raw["active_group_count"],
        pending_commitment_count=raw["pending_commitment_count"],
        overdue_commitment_count=raw["overdue_commitment_count"],
        groups=[GroupMomentSummaryOut.model_validate(g) for g in raw["groups"]],
        pending_commitments=[PendingCommitmentHomeRow.model_validate(r) for r in raw["pending_commitments"]],
        recent_activity=[GroupActivityOut.model_validate(a) for a in raw["recent_activity"]],
        top_signals=[GroupSignalOut.model_validate(s) for s in raw["top_signals"]],
    )


def _signal_intel_out(d: dict[str, Any]) -> GroupIntelligenceSignalOut:
    return GroupIntelligenceSignalOut.model_validate(d)


def _rec_intel_out(d: dict[str, Any]) -> GroupIntelligenceRecommendationOut:
    return GroupIntelligenceRecommendationOut.model_validate(d)


@router.get("/home/today", response_model=GroupHomeTodayOut)
def group_home_today(user_id: str = Depends(get_current_user_id)) -> GroupHomeTodayOut:
    sb = _sb()
    try:
        raw = group_intelligence_service.compute_home_today(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupHomeTodayOut.model_validate(raw)


@router.get("/home/summary", response_model=GroupIntelligenceSummaryOut)
def group_home_summary(user_id: str = Depends(get_current_user_id)) -> GroupIntelligenceSummaryOut:
    sb = _sb()
    try:
        raw = group_intelligence_service.compute_group_home_summary(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupIntelligenceSummaryOut.model_validate(raw)


@router.get("/home/recommendations", response_model=list[GroupIntelligenceRecommendationOut])
def group_home_recommendations(user_id: str = Depends(get_current_user_id)) -> list[GroupIntelligenceRecommendationOut]:
    sb = _sb()
    try:
        rows = group_intelligence_service.generate_group_recommendations(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [_rec_intel_out(r) for r in rows]


@router.get("/home/signals", response_model=list[GroupIntelligenceSignalOut])
def group_home_signals(user_id: str = Depends(get_current_user_id)) -> list[GroupIntelligenceSignalOut]:
    sb = _sb()
    try:
        rows = group_intelligence_service.generate_group_signals(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [_signal_intel_out(r) for r in rows]


@router.get("/home/nudges", response_model=list[GroupNudgeOut])
def group_home_nudges(user_id: str = Depends(get_current_user_id)) -> list[GroupNudgeOut]:
    sb = _sb()
    try:
        rows = group_intelligence_service.compute_people_needing_nudges(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    out: list[GroupNudgeOut] = []
    for r in rows:
        out.append(
            GroupNudgeOut(
                commitment_id=UUID(str(r["commitment_id"])),
                group_id=UUID(str(r["group_id"])),
                group_title=str(r.get("group_title") or ""),
                participant_id=UUID(str(r["participant_id"])),
                display_name=str(r.get("display_name") or ""),
                committed_amount=Decimal(str(r.get("committed_amount") or 0)),
                paid_amount=Decimal(str(r.get("paid_amount") or 0)),
                amount_remaining=Decimal(str(r.get("amount_remaining") or 0)),
                due_date=r.get("due_date"),
                status=str(r.get("status") or ""),
                overdue_days=int(r.get("overdue_days") or 0),
                cycle_label=r.get("cycle_label"),
                recommended_action_type=str(r.get("recommended_action_type") or ""),
                recommended_cta=str(r.get("recommended_cta") or ""),
            )
        )
    return out


@router.get("/home/health", response_model=list[GroupHealthRowOut])
def group_home_health(user_id: str = Depends(get_current_user_id)) -> list[GroupHealthRowOut]:
    sb = _sb()
    try:
        rows = group_intelligence_service.compute_group_health_rows(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupHealthRowOut.model_validate(r) for r in rows]


@router.get("/home/movement", response_model=list[GroupMovementOut])
def group_home_movement(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(40, ge=1, le=100),
) -> list[GroupMovementOut]:
    sb = _sb()
    try:
        rows = group_intelligence_service.compute_recent_group_movement(sb, user_id, limit=limit)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupMovementOut.model_validate(r) for r in rows]


@router.post("/moments", response_model=GroupMomentDetailOut)
def create_group_moment(
    body: GroupMomentCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupMomentDetailOut:
    sb = _sb()
    try:
        d = group_service.create_group_moment(sb, user_id, body)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    return _detail_model(d)


@router.get("/moments", response_model=list[GroupMomentSummaryOut])
def list_group_moments(user_id: str = Depends(get_current_user_id)) -> list[GroupMomentSummaryOut]:
    sb = _sb()
    try:
        rows = group_service.list_groups_for_user(sb, user_id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupMomentSummaryOut.model_validate(r) for r in rows]


@router.get("/moments/{group_id}", response_model=GroupMomentDetailOut)
def get_group_moment(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> GroupMomentDetailOut:
    sb = _sb()
    try:
        d = group_service.get_group_detail(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return _detail_model(d)


@router.patch("/moments/{group_id}", response_model=GroupMomentDetailOut)
def patch_group_moment(
    group_id: UUID,
    body: GroupMomentUpdate,
    user_id: str = Depends(get_current_user_id),
) -> GroupMomentDetailOut:
    sb = _sb()
    try:
        d = group_service.update_group(sb, user_id, str(group_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return _detail_model(d)


@router.delete("/moments/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_moment(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> None:
    sb = _sb()
    try:
        group_service.delete_group(sb, user_id, str(group_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e


@router.post("/moments/{group_id}/participants", response_model=GroupParticipantOut)
def add_participant_route(
    group_id: UUID,
    body: GroupParticipantCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupParticipantOut:
    sb = _sb()
    try:
        row = group_service.add_participant(sb, user_id, str(group_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupParticipantOut.model_validate(row)


@router.post(
    "/moments/{group_id}/participants/{participant_id}/invite",
    response_model=GroupInviteSendOut,
)
def post_send_participant_invite(
    group_id: UUID,
    participant_id: UUID,
    user_id: str = Depends(get_current_user_id),
    body: GroupInviteSendBody | None = Body(default=None),
) -> GroupInviteSendOut:
    sb = _sb()
    try:
        raw = group_service.send_participant_invite(sb, user_id, str(group_id), str(participant_id), body)
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupInviteSendOut.model_validate(raw)


@router.patch("/moments/{group_id}/participants/{participant_id}", response_model=GroupParticipantOut)
def patch_participant(
    group_id: UUID,
    participant_id: UUID,
    body: GroupParticipantUpdate,
    user_id: str = Depends(get_current_user_id),
) -> GroupParticipantOut:
    sb = _sb()
    try:
        row = group_service.update_participant(sb, user_id, str(group_id), str(participant_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupParticipantOut.model_validate(row)


@router.delete("/moments/{group_id}/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant_route(
    group_id: UUID,
    participant_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> None:
    sb = _sb()
    try:
        group_service.remove_participant(sb, user_id, str(group_id), str(participant_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e


@router.get("/moments/{group_id}/cycles", response_model=list[GroupCycleOut])
def get_cycles(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupCycleOut]:
    sb = _sb()
    try:
        rows = group_service.list_cycles(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupCycleOut.model_validate(r) for r in rows]


@router.get("/moments/{group_id}/cycle-status", response_model=GroupCycleStatusOut)
def get_cycle_status(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> GroupCycleStatusOut:
    sb = _sb()
    try:
        raw = group_intelligence_service.compute_cycle_status(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupCycleStatusOut.model_validate(raw)


@router.post("/moments/{group_id}/cycles", response_model=GroupCycleOut)
def post_cycle(
    group_id: UUID,
    body: GroupCycleCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupCycleOut:
    sb = _sb()
    payload = body.model_dump()
    payload["start_date"] = body.start_date
    payload["end_date"] = body.end_date
    try:
        row = group_service.create_cycle(sb, user_id, str(group_id), payload)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupCycleOut.model_validate(row)


@router.post("/moments/{group_id}/cycles/generate-next", response_model=GroupCycleOut)
def post_generate_next_cycle(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> GroupCycleOut:
    sb = _sb()
    try:
        row = group_service.generate_next_cycle(sb, user_id, str(group_id))
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupCycleOut.model_validate(row)


@router.get("/moments/{group_id}/commitments", response_model=list[GroupCommitmentOut])
def get_commitments(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
    cycle_id: UUID | None = Query(default=None),
) -> list[GroupCommitmentOut]:
    sb = _sb()
    try:
        rows = group_service.list_commitments(sb, user_id, str(group_id), str(cycle_id) if cycle_id else None)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupCommitmentOut.model_validate(r) for r in rows]


@router.get("/moments/{group_id}/positions", response_model=list[GroupPositionOut])
def get_positions(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupPositionOut]:
    sb = _sb()
    try:
        rows = group_service.get_positions(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupPositionOut.model_validate(r) for r in rows]


@router.get("/moments/{group_id}/member-summary", response_model=GroupMemberMoneySummaryOut)
def get_member_money_summary(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> GroupMemberMoneySummaryOut:
    sb = _sb()
    try:
        rows = group_service.build_member_money_summary(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupMemberMoneySummaryOut(
        members=[GroupMemberMoneySummaryRow.model_validate(r) for r in rows],
    )


@router.get("/moments/{group_id}/settlement-plan", response_model=GroupSettlementPlanOut)
def get_settlement_plan(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
    cycle_id: UUID | None = Query(default=None),
) -> GroupSettlementPlanOut:
    sb = _sb()
    try:
        row = group_service.get_settlement_plan(sb, user_id, str(group_id), str(cycle_id) if cycle_id else None)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupSettlementPlanOut.model_validate(row)


@router.post("/moments/{group_id}/commitments", response_model=list[GroupCommitmentOut])
def post_commitments_bulk(
    group_id: UUID,
    body: GroupCommitmentsBulkCreate,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupCommitmentOut]:
    sb = _sb()
    try:
        rows = group_service.bulk_create_commitments(sb, user_id, str(group_id), body)
    except (PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupCommitmentOut.model_validate(r) for r in rows]


@router.patch("/moments/{group_id}/commitments/{commitment_id}", response_model=GroupCommitmentOut)
def patch_commitment(
    group_id: UUID,
    commitment_id: UUID,
    body: GroupCommitmentUpdate,
    user_id: str = Depends(get_current_user_id),
) -> GroupCommitmentOut:
    sb = _sb()
    patch = body.model_dump(exclude_unset=True)
    if "committed_amount" in patch and patch["committed_amount"] is not None:
        patch["committed_amount"] = patch["committed_amount"]
    if "due_date" in patch and patch["due_date"] is not None:
        patch["due_date"] = patch["due_date"]
    try:
        row = group_service.update_commitment(sb, user_id, str(group_id), str(commitment_id), patch)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupCommitmentOut.model_validate(row)


@router.delete("/moments/{group_id}/commitments/{commitment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_commitment_route(
    group_id: UUID,
    commitment_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> None:
    sb = _sb()
    try:
        group_service.delete_commitment(sb, user_id, str(group_id), str(commitment_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e


@router.post("/moments/{group_id}/commitments/{commitment_id}/pay", response_model=GroupCommitmentOut)
def pay_commitment_route(
    group_id: UUID,
    commitment_id: UUID,
    body: PayCommitmentBody,
    user_id: str = Depends(get_current_user_id),
) -> GroupCommitmentOut:
    sb = _sb()
    try:
        row = group_service.record_commitment_payment(sb, user_id, str(group_id), str(commitment_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupCommitmentOut.model_validate(row)


@router.get("/moments/{group_id}/expenses", response_model=list[GroupExpenseOut])
def get_expenses(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupExpenseOut]:
    sb = _sb()
    try:
        rows = group_service.list_expenses(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupExpenseOut.model_validate(r) for r in rows]


@router.post("/moments/{group_id}/expenses", response_model=GroupExpenseOut)
def post_expense(
    group_id: UUID,
    body: GroupExpenseCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupExpenseOut:
    sb = _sb()
    try:
        row = group_service.create_expense(sb, user_id, str(group_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupExpenseOut.model_validate(row)


@router.get("/moments/{group_id}/recurring-expenses", response_model=list[GroupRecurringExpenseOut])
def get_recurring_expenses(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupRecurringExpenseOut]:
    sb = _sb()
    try:
        rows = group_service.list_recurring_expenses(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupRecurringExpenseOut.model_validate(r) for r in rows]


@router.post("/moments/{group_id}/recurring-expenses", response_model=GroupRecurringExpenseOut)
def post_recurring_expense(
    group_id: UUID,
    body: GroupRecurringExpenseCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupRecurringExpenseOut:
    sb = _sb()
    try:
        row = group_service.create_recurring_expense(sb, user_id, str(group_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupRecurringExpenseOut.model_validate(row)


@router.post("/moments/{group_id}/recurring-expenses/apply", response_model=GroupRecurringApplyOut)
def post_apply_recurring_expenses(
    group_id: UUID,
    body: GroupRecurringApplyBody,
    user_id: str = Depends(get_current_user_id),
) -> GroupRecurringApplyOut:
    sb = _sb()
    try:
        raw = group_service.apply_recurring_templates_optional_cycle(
            sb, user_id, str(group_id), str(body.cycle_id) if body.cycle_id else None
        )
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupRecurringApplyOut.model_validate(raw)


@router.patch("/moments/{group_id}/recurring-expenses/{recurring_id}", response_model=GroupRecurringExpenseOut)
def patch_recurring_expense(
    group_id: UUID,
    recurring_id: UUID,
    body: GroupRecurringExpenseUpdate,
    user_id: str = Depends(get_current_user_id),
) -> GroupRecurringExpenseOut:
    sb = _sb()
    try:
        row = group_service.update_recurring_expense(sb, user_id, str(group_id), str(recurring_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupRecurringExpenseOut.model_validate(row)


@router.delete("/moments/{group_id}/recurring-expenses/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_expense_route(
    group_id: UUID,
    recurring_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> None:
    sb = _sb()
    try:
        group_service.delete_recurring_expense(sb, user_id, str(group_id), str(recurring_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e


@router.post("/moments/{group_id}/settlements", response_model=GroupSettlementOut)
def post_settlement(
    group_id: UUID,
    body: GroupSettlementCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupSettlementOut:
    sb = _sb()
    try:
        row = group_service.create_settlement(sb, user_id, str(group_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupSettlementOut.model_validate(row)


@router.get("/moments/{group_id}/activity", response_model=list[GroupActivityOut])
def get_activity(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[GroupActivityOut]:
    sb = _sb()
    try:
        rows = group_service.list_activity(sb, user_id, str(group_id), limit=limit)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupActivityOut.model_validate(r) for r in rows]


@router.get("/moments/{group_id}/signals", response_model=list[GroupSignalOut])
def get_signals(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupSignalOut]:
    sb = _sb()
    try:
        rows = group_service.list_signals(sb, user_id, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupSignalOut.model_validate(r) for r in rows]


@router.post("/moments/{group_id}/signals/refresh", response_model=list[GroupSignalOut])
def post_refresh_signals(
    group_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> list[GroupSignalOut]:
    sb = _sb()
    try:
        group_service.assert_member(sb, user_id, str(group_id))
        rows = group_service.refresh_group_signals(sb, str(group_id))
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return [GroupSignalOut.model_validate(r) for r in rows]


@router.post("/moments/{group_id}/reminders", response_model=GroupReminderOut)
def post_reminder(
    group_id: UUID,
    body: GroupReminderCreate,
    user_id: str = Depends(get_current_user_id),
) -> GroupReminderOut:
    sb = _sb()
    try:
        row = group_service.send_reminder(sb, user_id, str(group_id), body)
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return GroupReminderOut.model_validate(row)
