package app.momentra.data

import android.app.Activity
import app.momentra.network.AuthResponse
import app.momentra.network.BusinessBudgetListOut
import app.momentra.network.BusinessBudgetCreateOut
import app.momentra.network.BusinessBudgetCreateIn
import app.momentra.network.BusinessBudgetMemberIn
import app.momentra.network.BusinessBudgetPatchIn
import app.momentra.network.BusinessExpenseCreateIn
import app.momentra.network.BusinessCatalogOut
import app.momentra.network.BusinessVendorCreateIn
import app.momentra.network.BusinessVendorPatchIn
import app.momentra.network.GroupExpenseCreateIn
import app.momentra.network.BusinessPendingInvitesOut
import app.momentra.network.GroupPendingInvitesOut
import app.momentra.network.GroupInviteEmailIn
import app.momentra.network.GroupInviteEmailOut
import app.momentra.network.GroupInviteLinkOut
import app.momentra.network.GroupMomentCreateIn
import app.momentra.network.GroupMomentDetailOut
import app.momentra.network.GroupMomentListOut
import app.momentra.network.GroupMomentOut
import app.momentra.network.GroupMomentPatchIn
import app.momentra.network.MeResponse
import app.momentra.network.MomentraApi
import app.momentra.network.PersonalHomeOut
import app.momentra.network.PersonalCategoryListOut
import app.momentra.network.PersonalMomentListResponse
import app.momentra.network.PersonalMomentItemOut
import app.momentra.network.PersonalMomentCreateIn
import app.momentra.network.PersonalMomentCreateOut
import app.momentra.network.PersonalMomentPatchIn
import app.momentra.network.PersonalReminderCreateIn
import app.momentra.network.PersonalReminderOut
import app.momentra.network.PersonalReminderPatchIn
import app.momentra.network.PersonalTransactionCreateIn
import app.momentra.network.PersonalTransactionOut
import app.momentra.network.PersonalTransactionPatchIn
import app.momentra.network.PersonalTransactionListOut
import app.momentra.network.SyncUserRequest
import app.momentra.network.TokenExchangeRequest
import app.momentra.network.V1CommitmentOut
import app.momentra.network.V1GuidanceOut
import app.momentra.network.V1HealthOut
import app.momentra.network.V1SignalOut
import app.momentra.network.ReceiptUploadOut
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.serialization.json.JsonObject
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import java.io.File
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

sealed class PhoneVerifyResult {
    data class CodeSent(
        val verificationId: String,
        val resendToken: PhoneAuthProvider.ForceResendingToken,
    ) : PhoneVerifyResult()

    data class InstantCredential(val credential: PhoneAuthCredential) : PhoneVerifyResult()
}

class AuthRepository(
    private val auth: FirebaseAuth,
    private val api: MomentraApi,
) {
    private var cachedAccessToken: String? = null

    val currentUser get() = auth.currentUser

    suspend fun getIdToken(): String? {
        val user = auth.currentUser ?: return null
        return user.getIdToken(false).await().token
    }

    /**
     * Starts Firebase Phone Auth. May return [PhoneVerifyResult.InstantCredential] on auto-retrieval,
     * or [PhoneVerifyResult.CodeSent] for manual OTP entry (matches iOS flow).
     */
    suspend fun verifyPhoneNumber(activity: Activity, phoneE164: String): PhoneVerifyResult =
        suspendCancellableCoroutine { cont ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    if (cont.isCompleted) return
                    cont.resume(PhoneVerifyResult.InstantCredential(credential))
                }

                override fun onVerificationFailed(e: FirebaseException) {
                    if (cont.isCompleted) return
                    cont.resumeWithException(e)
                }

                override fun onCodeSent(
                    verificationId: String,
                    token: PhoneAuthProvider.ForceResendingToken,
                ) {
                    if (cont.isCompleted) return
                    cont.resume(PhoneVerifyResult.CodeSent(verificationId, token))
                }
            }

            val options = PhoneAuthOptions.newBuilder(auth)
                .setPhoneNumber(phoneE164)
                .setTimeout(60L, TimeUnit.SECONDS)
                .setActivity(activity)
                .setCallbacks(callbacks)
                .build()
            PhoneAuthProvider.verifyPhoneNumber(options)
        }

    /**
     * Resend SMS using Firebase [forceResendingToken] from the initial [onCodeSent] callback.
     */
    suspend fun resendPhoneOtp(
        activity: Activity,
        phoneE164: String,
        forceResendingToken: PhoneAuthProvider.ForceResendingToken,
    ): PhoneVerifyResult =
        suspendCancellableCoroutine { cont ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    if (cont.isCompleted) return
                    cont.resume(PhoneVerifyResult.InstantCredential(credential))
                }

                override fun onVerificationFailed(e: FirebaseException) {
                    if (cont.isCompleted) return
                    cont.resumeWithException(e)
                }

                override fun onCodeSent(
                    verificationId: String,
                    token: PhoneAuthProvider.ForceResendingToken,
                ) {
                    if (cont.isCompleted) return
                    cont.resume(PhoneVerifyResult.CodeSent(verificationId, token))
                }
            }

            val options = PhoneAuthOptions.newBuilder(auth)
                .setPhoneNumber(phoneE164)
                .setTimeout(60L, TimeUnit.SECONDS)
                .setActivity(activity)
                .setCallbacks(callbacks)
                .setForceResendingToken(forceResendingToken)
                .build()
            PhoneAuthProvider.verifyPhoneNumber(options)
        }

    suspend fun signInWithPhoneCredential(credential: PhoneAuthCredential): Result<Unit> = runCatching {
        auth.signInWithCredential(credential).await()
    }

    suspend fun signInWithGoogleToken(idToken: String): Result<Unit> = runCatching {
        val credential = com.google.firebase.auth.GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential).await()
    }

    suspend fun verifyPhoneOtp(verificationId: String, code: String): Result<Unit> = runCatching {
        val credential = PhoneAuthProvider.getCredential(verificationId, code)
        auth.signInWithCredential(credential).await()
    }

    /** Same contract as iOS `POST /api/auth/exchange` after Firebase sign-in. */
    suspend fun exchangeSession(): Result<AuthResponse> = runCatching {
        val token = getIdToken() ?: error("Not signed in")
        val response = api.exchange(TokenExchangeRequest(firebaseToken = token))
        cachedAccessToken = response.accessToken
        response
    }

    suspend fun me(): Result<MeResponse> = runCatching {
        api.me("Bearer ${bearerToken()}")
    }

    suspend fun syncUserProfile(
        primaryFocus: String,
        defaultCurrency: String?,
        organizationName: String?,
    ): Result<Unit> = runCatching {
        api.syncUser(
            "Bearer ${bearerToken()}",
            SyncUserRequest(
                primaryFocus = primaryFocus,
                defaultCurrency = defaultCurrency,
                organizationName = organizationName,
                setupCompleted = true,
            ),
        )
        Unit
    }

    suspend fun personalHome(): Result<PersonalHomeOut> = runCatching {
        api.personalHome("Bearer ${bearerToken()}")
    }

    suspend fun personalMoments(): Result<PersonalMomentListResponse> = runCatching {
        api.personalMoments("Bearer ${bearerToken()}")
    }

    suspend fun createPersonalMoment(body: PersonalMomentCreateIn): Result<PersonalMomentCreateOut> = runCatching {
        api.createPersonalMoment("Bearer ${bearerToken()}", body)
    }

    suspend fun personalTransactions(limit: Int = 10): Result<PersonalTransactionListOut> = runCatching {
        api.personalTransactions("Bearer ${bearerToken()}", kind = "all", limit = limit)
    }

    suspend fun personalCategories(kind: String): Result<PersonalCategoryListOut> = runCatching {
        api.personalCategories("Bearer ${bearerToken()}", kind = kind)
    }

    suspend fun createPersonalTransaction(body: PersonalTransactionCreateIn): Result<PersonalTransactionOut> = runCatching {
        api.createPersonalTransaction("Bearer ${bearerToken()}", body)
    }

    suspend fun patchPersonalTransaction(transactionId: String, body: PersonalTransactionPatchIn): Result<PersonalTransactionOut> = runCatching {
        api.patchPersonalTransaction("Bearer ${bearerToken()}", transactionId, body)
    }

    suspend fun deletePersonalTransaction(transactionId: String): Result<Unit> = runCatching {
        api.deletePersonalTransaction("Bearer ${bearerToken()}", transactionId)
        Unit
    }

    suspend fun patchPersonalMoment(momentId: String, body: PersonalMomentPatchIn): Result<PersonalMomentItemOut> = runCatching {
        api.patchPersonalMoment("Bearer ${bearerToken()}", momentId, body)
    }

    suspend fun deletePersonalMoment(momentId: String): Result<Unit> = runCatching {
        api.deletePersonalMoment("Bearer ${bearerToken()}", momentId)
        Unit
    }

    suspend fun groupMoments(): Result<GroupMomentListOut> = runCatching {
        api.groupMoments("Bearer ${bearerToken()}")
    }

    suspend fun createGroupMoment(body: GroupMomentCreateIn): Result<GroupMomentOut> = runCatching {
        api.createGroupMoment("Bearer ${bearerToken()}", body)
    }

    suspend fun businessMoments(): Result<BusinessBudgetListOut> = runCatching {
        api.businessMoments("Bearer ${bearerToken()}")
    }

    suspend fun createBusinessMoment(body: BusinessBudgetCreateIn): Result<BusinessBudgetCreateOut> = runCatching {
        api.createBusinessMoment("Bearer ${bearerToken()}", body)
    }

    suspend fun groupMomentDetail(momentId: String): Result<GroupMomentDetailOut> = runCatching {
        api.groupMomentDetail("Bearer ${bearerToken()}", momentId)
    }

    suspend fun createGroupExpense(momentId: String, body: GroupExpenseCreateIn): Result<GroupMomentDetailOut> = runCatching {
        api.createGroupExpense("Bearer ${bearerToken()}", momentId, body)
    }

    suspend fun groupInviteLink(momentId: String): Result<GroupInviteLinkOut> = runCatching {
        api.groupInviteLink("Bearer ${bearerToken()}", momentId, JsonObject(mapOf()))
    }

    suspend fun sendGroupInviteEmails(momentId: String, body: GroupInviteEmailIn): Result<GroupInviteEmailOut> = runCatching {
        api.sendGroupInviteEmails("Bearer ${bearerToken()}", momentId, body)
    }

    suspend fun businessPendingInvites(): Result<BusinessPendingInvitesOut> = runCatching {
        api.businessPendingInvites("Bearer ${bearerToken()}")
    }

    suspend fun declineBusinessInvite(memberId: String): Result<Map<String, String>> = runCatching {
        api.declineBusinessInvite("Bearer ${bearerToken()}", memberId)
    }

    suspend fun groupPendingInvites(): Result<GroupPendingInvitesOut> = runCatching {
        api.groupPendingInvites("Bearer ${bearerToken()}")
    }

    suspend fun declineGroupInvite(inviteId: String): Result<Map<String, String>> = runCatching {
        api.declineGroupInvite("Bearer ${bearerToken()}", inviteId)
    }

    suspend fun businessInviteLink(budgetId: String): Result<GroupInviteLinkOut> = runCatching {
        api.businessInviteLink("Bearer ${bearerToken()}", budgetId, JsonObject(mapOf()))
    }

    suspend fun sendBusinessInviteEmails(budgetId: String, body: GroupInviteEmailIn): Result<GroupInviteEmailOut> = runCatching {
        api.sendBusinessInviteEmails("Bearer ${bearerToken()}", budgetId, body)
    }

    suspend fun joinBusinessBudget(budgetId: String): Result<BusinessBudgetCreateOut> = runCatching {
        api.joinBusinessBudget("Bearer ${bearerToken()}", budgetId)
    }

    suspend fun joinBusinessWithToken(token: String): Result<Map<String, String>> = runCatching {
        api.joinBusinessWithToken("Bearer ${bearerToken()}", token)
    }

    suspend fun joinGroupWithToken(token: String): Result<Map<String, String>> = runCatching {
        api.joinGroupWithToken("Bearer ${bearerToken()}", token)
    }

    suspend fun patchGroupMoment(momentId: String, body: GroupMomentPatchIn): Result<GroupMomentDetailOut> = runCatching {
        api.patchGroupMoment("Bearer ${bearerToken()}", momentId, body)
    }

    suspend fun deleteGroupMoment(momentId: String): Result<Unit> = runCatching {
        api.deleteGroupMoment("Bearer ${bearerToken()}", momentId)
        Unit
    }

    suspend fun businessMomentDetail(budgetId: String): Result<BusinessBudgetCreateOut> = runCatching {
        api.businessMomentDetail("Bearer ${bearerToken()}", budgetId)
    }

    suspend fun addBusinessBudgetMember(budgetId: String, body: BusinessBudgetMemberIn): Result<BusinessBudgetCreateOut> = runCatching {
        api.addBusinessBudgetMember("Bearer ${bearerToken()}", budgetId, body)
    }

    suspend fun createBusinessExpense(budgetId: String, body: BusinessExpenseCreateIn): Result<BusinessBudgetCreateOut> = runCatching {
        api.createBusinessExpense("Bearer ${bearerToken()}", budgetId, body)
    }

    suspend fun businessBudgetCatalog(budgetId: String): Result<BusinessCatalogOut> = runCatching {
        api.businessBudgetCatalog("Bearer ${bearerToken()}", budgetId)
    }

    suspend fun approveBusinessBudgetApproval(
        budgetId: String,
        approvalId: String,
    ): Result<BusinessBudgetCreateOut> = runCatching {
        api.approveBusinessBudgetApproval("Bearer ${bearerToken()}", budgetId, approvalId)
    }

    suspend fun rejectBusinessBudgetApproval(
        budgetId: String,
        approvalId: String,
    ): Result<BusinessBudgetCreateOut> = runCatching {
        api.rejectBusinessBudgetApproval("Bearer ${bearerToken()}", budgetId, approvalId)
    }

    suspend fun createBusinessVendor(budgetId: String, body: BusinessVendorCreateIn): Result<BusinessBudgetCreateOut> = runCatching {
        api.createBusinessVendor("Bearer ${bearerToken()}", budgetId, body)
    }

    suspend fun patchBusinessVendor(
        budgetId: String,
        vendorId: String,
        body: BusinessVendorPatchIn,
    ): Result<BusinessBudgetCreateOut> = runCatching {
        api.patchBusinessVendor("Bearer ${bearerToken()}", budgetId, vendorId, body)
    }

    suspend fun deleteBusinessVendor(
        budgetId: String,
        vendorId: String,
    ): Result<BusinessBudgetCreateOut> = runCatching {
        api.deleteBusinessVendor("Bearer ${bearerToken()}", budgetId, vendorId)
    }

    suspend fun uploadBusinessReceipt(
        budgetId: String,
        approvalId: String,
        file: File,
        mimeType: String,
    ): Result<BusinessBudgetCreateOut> = runCatching {
        val part = MultipartBody.Part.createFormData(
            "file",
            file.name,
            file.asRequestBody(mimeType.toMediaTypeOrNull()),
        )
        api.uploadBusinessReceipt("Bearer ${bearerToken()}", budgetId, approvalId, part)
    }

    suspend fun downloadBusinessReceipt(
        budgetId: String,
        approvalId: String,
    ): Result<ResponseBody> = runCatching {
        api.downloadBusinessReceipt("Bearer ${bearerToken()}", budgetId, approvalId)
    }

    suspend fun patchBusinessBudget(budgetId: String, body: BusinessBudgetPatchIn): Result<BusinessBudgetCreateOut> = runCatching {
        api.patchBusinessBudget("Bearer ${bearerToken()}", budgetId, body)
    }

    suspend fun deleteBusinessBudget(budgetId: String): Result<Unit> = runCatching {
        api.deleteBusinessBudget("Bearer ${bearerToken()}", budgetId)
        Unit
    }

    suspend fun v1MomentHealth(momentId: String): Result<V1HealthOut> = runCatching {
        api.v1MomentHealth("Bearer ${bearerToken()}", momentId)
    }

    suspend fun v1MomentHealthHistory(momentId: String, limit: Int = 20): Result<List<V1HealthOut>> = runCatching {
        api.v1MomentHealthHistory("Bearer ${bearerToken()}", momentId, limit)
    }

    suspend fun v1MomentCommitments(momentId: String): Result<List<V1CommitmentOut>> = runCatching {
        api.v1MomentCommitments("Bearer ${bearerToken()}", momentId)
    }

    suspend fun v1MomentSignals(momentId: String): Result<List<V1SignalOut>> = runCatching {
        api.v1MomentSignals("Bearer ${bearerToken()}", momentId)
    }

    suspend fun v1MomentGuidance(momentId: String): Result<List<V1GuidanceOut>> = runCatching {
        api.v1MomentGuidance("Bearer ${bearerToken()}", momentId)
    }

    suspend fun v1ResolveSignal(momentId: String, signalId: String): Result<Unit> = runCatching {
        api.v1ResolveSignal("Bearer ${bearerToken()}", momentId, signalId)
        Unit
    }

    suspend fun v1MarkGuidanceRead(momentId: String, guidanceId: String): Result<Unit> = runCatching {
        api.v1MarkGuidanceRead("Bearer ${bearerToken()}", momentId, guidanceId)
        Unit
    }

    suspend fun personalReminders(upcoming: Boolean = true, limit: Int = 50): Result<List<PersonalReminderOut>> = runCatching {
        api.personalReminders("Bearer ${bearerToken()}", upcoming, limit)
    }

    suspend fun createPersonalReminder(body: PersonalReminderCreateIn): Result<PersonalReminderOut> = runCatching {
        api.createPersonalReminder("Bearer ${bearerToken()}", body)
    }

    suspend fun patchPersonalReminder(reminderId: String, body: PersonalReminderPatchIn): Result<PersonalReminderOut> = runCatching {
        api.patchPersonalReminder("Bearer ${bearerToken()}", reminderId, body)
    }

    suspend fun deletePersonalReminder(reminderId: String): Result<Unit> = runCatching {
        api.deletePersonalReminder("Bearer ${bearerToken()}", reminderId)
        Unit
    }

    // ── Receipt Upload ─────────────────────────────────────────────────────

    suspend fun uploadReceipt(
        file: File,
        mimeType: String = "image/jpeg",
        transactionId: String? = null,
        groupExpenseId: String? = null,
        compress: Boolean = true,
    ): Result<ReceiptUploadOut> = runCatching {
        val filePart = MultipartBody.Part.createFormData(
            "file",
            file.name,
            file.asRequestBody(mimeType.toMediaTypeOrNull()),
        )
        val transactionIdPart = transactionId?.let {
            it.toRequestBody("text/plain".toMediaTypeOrNull())
        }
        val groupExpenseIdPart = groupExpenseId?.let {
            it.toRequestBody("text/plain".toMediaTypeOrNull())
        }
        val compressPart = compress.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        api.uploadReceipt(
            authorization = "Bearer ${bearerToken()}",
            file = filePart,
            transactionId = transactionIdPart,
            groupExpenseId = groupExpenseIdPart,
            compress = compressPart,
        )
    }

    fun signOut() {
        cachedAccessToken = null
        auth.signOut()
    }

    private suspend fun bearerToken(): String {
        return cachedAccessToken ?: getIdToken() ?: error("Not signed in")
    }
}
