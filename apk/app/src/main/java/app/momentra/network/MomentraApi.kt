package app.momentra.network

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.Part
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.DELETE
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.http.Streaming
import java.util.concurrent.TimeUnit

interface MomentraApi {
    @POST("api/auth/exchange")
    suspend fun exchange(@Body body: TokenExchangeRequest): AuthResponse

    @GET("me")
    suspend fun me(@Header("Authorization") authorization: String): MeResponse

    @POST("users/sync")
    suspend fun syncUser(
        @Header("Authorization") authorization: String,
        @Body body: SyncUserRequest,
    ): Map<String, String>

    @GET("personal/home")
    suspend fun personalHome(@Header("Authorization") authorization: String): PersonalHomeOut

    @GET("personal/moments")
    suspend fun personalMoments(@Header("Authorization") authorization: String): PersonalMomentListResponse

    @POST("personal/moments")
    suspend fun createPersonalMoment(
        @Header("Authorization") authorization: String,
        @Body body: PersonalMomentCreateIn,
    ): PersonalMomentCreateOut

    @GET("personal/transactions")
    suspend fun personalTransactions(
        @Header("Authorization") authorization: String,
        @Query("kind") kind: String = "all",
        @Query("limit") limit: Int = 10,
    ): PersonalTransactionListOut

    @GET("personal/categories")
    suspend fun personalCategories(
        @Header("Authorization") authorization: String,
        @Query("kind") kind: String,
    ): PersonalCategoryListOut

    @POST("personal/transactions")
    suspend fun createPersonalTransaction(
        @Header("Authorization") authorization: String,
        @Body body: PersonalTransactionCreateIn,
    ): PersonalTransactionOut

    @PATCH("personal/transactions/{transaction_id}")
    suspend fun patchPersonalTransaction(
        @Header("Authorization") authorization: String,
        @Path("transaction_id") transactionId: String,
        @Body body: PersonalTransactionPatchIn,
    ): PersonalTransactionOut

    @DELETE("personal/transactions/{transaction_id}")
    suspend fun deletePersonalTransaction(
        @Header("Authorization") authorization: String,
        @Path("transaction_id") transactionId: String,
    )

    @PATCH("personal/moments/{moment_id}")
    suspend fun patchPersonalMoment(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Body body: PersonalMomentPatchIn,
    ): PersonalMomentItemOut

    @DELETE("personal/moments/{moment_id}")
    suspend fun deletePersonalMoment(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): Unit

    @GET("group/moments")
    suspend fun groupMoments(@Header("Authorization") authorization: String): GroupMomentListOut

    @POST("group/moments")
    suspend fun createGroupMoment(
        @Header("Authorization") authorization: String,
        @Body body: GroupMomentCreateIn,
    ): GroupMomentOut

    @GET("group/moments/{moment_id}")
    suspend fun groupMomentDetail(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): GroupMomentDetailOut

    @PATCH("group/moments/{moment_id}")
    suspend fun patchGroupMoment(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Body body: GroupMomentPatchIn,
    ): GroupMomentDetailOut

    @DELETE("group/moments/{moment_id}")
    suspend fun deleteGroupMoment(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): Unit

    @POST("group/moments/{moment_id}/expenses")
    suspend fun createGroupExpense(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Body body: GroupExpenseCreateIn,
    ): GroupMomentDetailOut

    @POST("group/moments/{moment_id}/invites/link")
    suspend fun groupInviteLink(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Body body: JsonObject,
    ): GroupInviteLinkOut

    @POST("group/moments/{moment_id}/invites/email")
    suspend fun sendGroupInviteEmails(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Body body: GroupInviteEmailIn,
    ): GroupInviteEmailOut

    @GET("business/moments")
    suspend fun businessMoments(@Header("Authorization") authorization: String): BusinessBudgetListOut

    @POST("business/moments")
    suspend fun createBusinessMoment(
        @Header("Authorization") authorization: String,
        @Body body: BusinessBudgetCreateIn,
    ): BusinessBudgetCreateOut

    @GET("business/moments/{budget_id}")
    suspend fun businessMomentDetail(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
    ): BusinessBudgetCreateOut

    @POST("business/budgets/{budget_id}/members")
    suspend fun addBusinessBudgetMember(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Body body: BusinessBudgetMemberIn,
    ): BusinessBudgetCreateOut

    @POST("business/budgets/{budget_id}/expenses")
    suspend fun createBusinessExpense(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Body body: BusinessExpenseCreateIn,
    ): BusinessBudgetCreateOut

    @GET("business/budgets/{budget_id}/catalog")
    suspend fun businessBudgetCatalog(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
    ): BusinessCatalogOut

    @POST("business/budgets/{budget_id}/approvals/{approval_id}/approve")
    suspend fun approveBusinessBudgetApproval(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Path("approval_id") approvalId: String,
    ): BusinessBudgetCreateOut

    @POST("business/budgets/{budget_id}/approvals/{approval_id}/reject")
    suspend fun rejectBusinessBudgetApproval(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Path("approval_id") approvalId: String,
    ): BusinessBudgetCreateOut

    @POST("business/budgets/{budget_id}/vendors")
    suspend fun createBusinessVendor(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Body body: BusinessVendorCreateIn,
    ): BusinessBudgetCreateOut

    @PATCH("business/budgets/{budget_id}/vendors/{vendor_id}")
    suspend fun patchBusinessVendor(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Path("vendor_id") vendorId: String,
        @Body body: BusinessVendorPatchIn,
    ): BusinessBudgetCreateOut

    @DELETE("business/budgets/{budget_id}/vendors/{vendor_id}")
    suspend fun deleteBusinessVendor(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Path("vendor_id") vendorId: String,
    ): BusinessBudgetCreateOut

    @Multipart
    @POST("business/budgets/{budget_id}/approvals/{approval_id}/receipt")
    suspend fun uploadBusinessReceipt(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Path("approval_id") approvalId: String,
        @Part file: MultipartBody.Part,
    ): BusinessBudgetCreateOut

    @Streaming
    @GET("business/budgets/{budget_id}/approvals/{approval_id}/receipt")
    suspend fun downloadBusinessReceipt(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Path("approval_id") approvalId: String,
    ): ResponseBody

    @PATCH("business/budgets/{budget_id}")
    suspend fun patchBusinessBudget(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Body body: BusinessBudgetPatchIn,
    ): BusinessBudgetCreateOut

    @DELETE("business/budgets/{budget_id}")
    suspend fun deleteBusinessBudget(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
    ): Unit

    @GET("business/moments/invites/pending")
    suspend fun businessPendingInvites(
        @Header("Authorization") authorization: String,
    ): BusinessPendingInvitesOut

    @POST("business/moments/invites/{member_id}/decline")
    suspend fun declineBusinessInvite(
        @Header("Authorization") authorization: String,
        @Path("member_id") memberId: String,
    ): Map<String, String>

    @GET("group/moments/invites/pending")
    suspend fun groupPendingInvites(
        @Header("Authorization") authorization: String,
    ): GroupPendingInvitesOut

    @POST("group/moments/invites/{invite_id}/decline")
    suspend fun declineGroupInvite(
        @Header("Authorization") authorization: String,
        @Path("invite_id") inviteId: String,
    ): Map<String, String>

    @POST("business/moments/{budget_id}/invites/link")
    suspend fun businessInviteLink(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Body body: JsonObject,
    ): GroupInviteLinkOut

    @POST("business/moments/{budget_id}/invites/email")
    suspend fun sendBusinessInviteEmails(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
        @Body body: GroupInviteEmailIn,
    ): GroupInviteEmailOut

    @POST("business/budgets/{budget_id}/members/join")
    suspend fun joinBusinessBudget(
        @Header("Authorization") authorization: String,
        @Path("budget_id") budgetId: String,
    ): BusinessBudgetCreateOut

    @POST("business/join/{token}")
    suspend fun joinBusinessWithToken(
        @Header("Authorization") authorization: String,
        @Path("token") token: String,
    ): Map<String, String>

    @POST("group/join/{token}")
    suspend fun joinGroupWithToken(
        @Header("Authorization") authorization: String,
        @Path("token") token: String,
    ): Map<String, String>

    @GET("v1/moments/{moment_id}/health")
    suspend fun v1MomentHealth(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): V1HealthOut

    @GET("v1/moments/{moment_id}/health/history")
    suspend fun v1MomentHealthHistory(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Query("limit") limit: Int = 20,
    ): List<V1HealthOut>

    @GET("v1/moments/{moment_id}/commitments")
    suspend fun v1MomentCommitments(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): List<V1CommitmentOut>

    @GET("v1/moments/{moment_id}/signals")
    suspend fun v1MomentSignals(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): List<V1SignalOut>

    @GET("v1/moments/{moment_id}/guidance")
    suspend fun v1MomentGuidance(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
    ): List<V1GuidanceOut>

    @POST("v1/moments/{moment_id}/signals/{signal_id}/resolve")
    suspend fun v1ResolveSignal(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Path("signal_id") signalId: String,
    ): Map<String, String>

    @POST("v1/moments/{moment_id}/guidance/{guidance_id}/read")
    suspend fun v1MarkGuidanceRead(
        @Header("Authorization") authorization: String,
        @Path("moment_id") momentId: String,
        @Path("guidance_id") guidanceId: String,
    ): Map<String, String>

    // ── Bill & Recharge Reminders ─────────────────────────────────────────

    @GET("personal/reminders")
    suspend fun personalReminders(
        @Header("Authorization") authorization: String,
        @Query("upcoming") upcoming: Boolean = false,
        @Query("limit") limit: Int = 50,
    ): List<PersonalReminderOut>

    @POST("personal/reminders")
    suspend fun createPersonalReminder(
        @Header("Authorization") authorization: String,
        @Body body: PersonalReminderCreateIn,
    ): PersonalReminderOut

    @PATCH("personal/reminders/{reminder_id}")
    suspend fun patchPersonalReminder(
        @Header("Authorization") authorization: String,
        @Path("reminder_id") reminderId: String,
        @Body body: PersonalReminderPatchIn,
    ): PersonalReminderOut

    @DELETE("personal/reminders/{reminder_id}")
    suspend fun deletePersonalReminder(
        @Header("Authorization") authorization: String,
        @Path("reminder_id") reminderId: String,
    )

    // ── Receipt Upload ─────────────────────────────────────────────────────

    @Multipart
    @POST("storage/upload/receipt")
    suspend fun uploadReceipt(
        @Header("Authorization") authorization: String,
        @Part file: MultipartBody.Part,
        @Part("transaction_id") transactionId: RequestBody?,
        @Part("group_expense_id") groupExpenseId: RequestBody?,
        @Part("compress") compress: RequestBody?,
    ): ReceiptUploadOut
}

fun createMomentraApi(baseUrl: String): MomentraApi {
    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }
    val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }
    val client = OkHttpClient.Builder()
        .addInterceptor(logging)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    val contentType = "application/json".toMediaType()
    return Retrofit.Builder()
        .baseUrl(baseUrl.ensureTrailingSlash())
        .client(client)
        .addConverterFactory(json.asConverterFactory(contentType))
        .build()
        .create(MomentraApi::class.java)
}

private fun String.ensureTrailingSlash(): String = if (endsWith("/")) this else "$this/"
