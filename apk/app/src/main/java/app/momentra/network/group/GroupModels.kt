package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Allowed values for [GroupMomentCreateIn.splitMode]; must match backend `GROUP_SPLIT_MODE_VALUES`. */
object GroupSplitMode {
    const val EQUAL = "equal"
    const val EXACT = "exact"
    const val PERCENT = "percent"
    const val SHARES = "shares"
}

@Serializable
data class GroupMomentRulesIn(
    @SerialName("send_payment_reminders") val sendPaymentReminders: Boolean = true,
    @SerialName("auto_notify_on_contribution") val autoNotifyOnContribution: Boolean = true,
    @SerialName("allow_partial_payments") val allowPartialPayments: Boolean = true,
    @SerialName("require_receipt_for_expenses") val requireReceiptForExpenses: Boolean = false,
    @SerialName("require_organiser_approval") val requireOrganiserApproval: Boolean = false,
)

@Serializable
data class GroupMemberSeedIn(
    @SerialName("display_name") val displayName: String,
    val email: String? = null,
    val role: String = "member",
)

@Serializable
data class GroupMomentCreateIn(
    val title: String,
    @SerialName("moment_type") val momentType: String = "trip_fund",
    @SerialName("target_amount") val targetAmount: Double? = null,
    val destination: String? = null,
    @SerialName("trip_start_date") val tripStartDate: String? = null,
    @SerialName("trip_end_date") val tripEndDate: String? = null,
    @SerialName("split_mode") val splitMode: String = GroupSplitMode.EQUAL,
    @SerialName("contribution_due_date") val contributionDueDate: String? = null,
    val members: List<GroupMemberSeedIn> = emptyList(),
    val rules: GroupMomentRulesIn = GroupMomentRulesIn(),
)

@Serializable
data class GroupMomentOut(
    @SerialName("moment_id") val momentId: String,
    @SerialName("owner_uid") val ownerUid: String = "",
    val title: String,
    @SerialName("moment_type") val momentType: String,
    @SerialName("target_amount") val targetAmount: Double? = null,
    val destination: String? = null,
    @SerialName("trip_start_date") val tripStartDate: String? = null,
    @SerialName("trip_end_date") val tripEndDate: String? = null,
    @SerialName("split_mode") val splitMode: String = GroupSplitMode.EQUAL,
    @SerialName("contribution_due_date") val contributionDueDate: String? = null,
    val status: String = "active",
    @SerialName("join_url") val joinUrl: String = "",
    @SerialName("joined_count") val joinedCount: Int = 0,
    @SerialName("invited_count") val invitedCount: Int = 0,
    @SerialName("raised_amount") val raisedAmount: Double = 0.0,
)

@Serializable
data class GroupMomentListOut(
    val moments: List<GroupMomentOut> = emptyList(),
)

@Serializable
data class GroupMomentRulesOut(
    @SerialName("send_payment_reminders") val sendPaymentReminders: Boolean = true,
    @SerialName("auto_notify_on_contribution") val autoNotifyOnContribution: Boolean = true,
    @SerialName("allow_partial_payments") val allowPartialPayments: Boolean = true,
    @SerialName("require_receipt_for_expenses") val requireReceiptForExpenses: Boolean = false,
    @SerialName("require_organiser_approval") val requireOrganiserApproval: Boolean = false,
)

@Serializable
data class GroupMemberLedgerOut(
    @SerialName("member_id") val memberId: String,
    @SerialName("firebase_uid") val firebaseUid: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val email: String? = null,
    val role: String = "",
    val status: String = "",
    @SerialName("joined_at") val joinedAt: String? = null,
    @SerialName("expected_share") val expectedShare: Double = 0.0,
    @SerialName("contributed_total") val contributedTotal: Double = 0.0,
    val paid: Boolean = false,
)

@Serializable
data class GroupBudgetCategoryOut(
    @SerialName("category_id") val categoryId: String,
    @SerialName("category_key") val categoryKey: String,
    @SerialName("display_name") val displayName: String,
    @SerialName("cap_amount") val capAmount: Double = 0.0,
    @SerialName("spent_amount") val spentAmount: Double = 0.0,
)

@Serializable
data class GroupExpenseSplitDetailOut(
    @SerialName("member_id") val memberId: String,
    @SerialName("display_name") val displayName: String? = null,
    val amount: Double,
)

@Serializable
data class GroupExpenseOut(
    @SerialName("expense_id") val expenseId: String,
    @SerialName("category_key") val categoryKey: String,
    val subcategory: String? = null,
    val title: String,
    val amount: Double,
    @SerialName("expense_date") val expenseDate: String,
    @SerialName("paid_by_member_id") val paidByMemberId: String? = null,
    @SerialName("paid_by_name") val paidByName: String? = null,
    @SerialName("split_mode") val splitMode: String = GroupSplitMode.EQUAL,
    @SerialName("split_lines") val splitLines: List<GroupExpenseSplitDetailOut> = emptyList(),
    val status: String = "",
    @SerialName("has_receipt") val hasReceipt: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class GroupTotalsOut(
    @SerialName("raised_amount") val raisedAmount: Double = 0.0,
    @SerialName("spent_expenses_amount") val spentExpensesAmount: Double = 0.0,
    @SerialName("last_activity_at") val lastActivityAt: String? = null,
)

@Serializable
data class GroupExpenseSplitLineIn(
    @SerialName("member_id") val memberId: String,
    val value: Double,
)

@Serializable
data class GroupExpenseCreateIn(
    @SerialName("category_key") val categoryKey: String,
    val subcategory: String? = null,
    val title: String,
    val amount: Double,
    @SerialName("expense_date") val expenseDate: String,
    @SerialName("paid_by_member_id") val paidByMemberId: String,
    @SerialName("receipt_notes") val receiptNotes: String? = null,
    @SerialName("split_mode") val splitMode: String = GroupSplitMode.EQUAL,
    @SerialName("split_lines") val splitLines: List<GroupExpenseSplitLineIn> = emptyList(),
)

@Serializable
data class GroupInviteLinkOut(
    @SerialName("join_url") val joinUrl: String,
)

@Serializable
data class GroupInviteEmailIn(
    val emails: List<String> = emptyList(),
    val message: String? = null,
    val resend: Boolean = false,
)

@Serializable
data class GroupInviteEmailOut(
    val sent: Int = 0,
    val failed: Int = 0,
    val total: Int = 0,
    @SerialName("error_messages") val errorMessages: List<String> = emptyList(),
)

@Serializable
data class GroupPendingInviteOut(
    @SerialName("invite_id") val inviteId: String,
    @SerialName("moment_id") val momentId: String,
    @SerialName("moment_title") val momentTitle: String,
    val email: String,
    val status: String,
    @SerialName("sent_at") val sentAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("invite_token") val inviteToken: String,
)

@Serializable
data class GroupPendingInvitesOut(
    val invites: List<GroupPendingInviteOut> = emptyList(),
)

@Serializable
data class GroupMomentDetailOut(
    val moment: GroupMomentOut,
    val members: List<GroupMemberLedgerOut> = emptyList(),
    val rules: GroupMomentRulesOut = GroupMomentRulesOut(),
    @SerialName("budget_categories") val budgetCategories: List<GroupBudgetCategoryOut> = emptyList(),
    val expenses: List<GroupExpenseOut> = emptyList(),
    val totals: GroupTotalsOut? = null,
)

@Serializable
data class GroupMomentPatchIn(
    val title: String? = null,
    @SerialName("target_amount") val targetAmount: Double? = null,
    val destination: String? = null,
    @SerialName("contribution_due_date") val contributionDueDate: String? = null,
    val rules: GroupMomentRulesIn? = null,
    val status: String? = null,
)

