package app.momentra.data.group

import app.momentra.data.AuthRepository
import app.momentra.network.GroupExpenseCreateIn
import app.momentra.network.GroupInviteEmailIn
import app.momentra.network.GroupInviteEmailOut
import app.momentra.network.GroupInviteLinkOut
import app.momentra.network.GroupMomentCreateIn
import app.momentra.network.GroupMomentDetailOut
import app.momentra.network.GroupMomentListOut
import app.momentra.network.GroupMomentOut
import app.momentra.network.GroupMomentPatchIn
import app.momentra.network.GroupPendingInvitesOut

class GroupApiRepository(
    private val authRepository: AuthRepository,
) {
    suspend fun moments(): Result<GroupMomentListOut> = authRepository.groupMoments()
    suspend fun createMoment(body: GroupMomentCreateIn): Result<GroupMomentOut> =
        authRepository.createGroupMoment(body)
    suspend fun momentDetail(momentId: String): Result<GroupMomentDetailOut> =
        authRepository.groupMomentDetail(momentId)
    suspend fun patchMoment(momentId: String, body: GroupMomentPatchIn): Result<GroupMomentDetailOut> =
        authRepository.patchGroupMoment(momentId, body)
    suspend fun createExpense(momentId: String, body: GroupExpenseCreateIn): Result<GroupMomentDetailOut> =
        authRepository.createGroupExpense(momentId, body)
    suspend fun inviteLink(momentId: String): Result<GroupInviteLinkOut> =
        authRepository.groupInviteLink(momentId)
    suspend fun sendInvites(momentId: String, body: GroupInviteEmailIn): Result<GroupInviteEmailOut> =
        authRepository.sendGroupInviteEmails(momentId, body)
    suspend fun pendingInvites(): Result<GroupPendingInvitesOut> = authRepository.groupPendingInvites()
}

