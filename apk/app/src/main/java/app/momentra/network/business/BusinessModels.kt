package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BusinessPendingInviteOut(
    @SerialName("budget_id") val budgetId: String,
    @SerialName("budget_name") val budgetName: String,
    @SerialName("member_id") val memberId: String,
    val role: String,
    @SerialName("invited_at") val invitedAt: String? = null,
    @SerialName("invite_token") val inviteToken: String,
)

@Serializable
data class BusinessPendingInvitesOut(
    val invites: List<BusinessPendingInviteOut> = emptyList(),
)

@Serializable
data class BusinessBudgetCreateOut(
    @SerialName("budget_id") val budgetId: String,
    @SerialName("budget_name") val budgetName: String,
    @SerialName("budget_type") val budgetType: String,
    val status: String,
    @SerialName("total_budget") val totalBudget: Double? = null,
    @SerialName("budget_period") val budgetPeriod: String? = null,
    val department: String? = null,
    @SerialName("approval_threshold") val approvalThreshold: Double? = null,
    @SerialName("spent_amount") val spentAmount: Double = 0.0,
    val categories: List<BusinessBudgetCategoryOut> = emptyList(),
    @SerialName("reminder_prefs") val reminderPrefs: BusinessBudgetReminderPrefsOut? = null,
    @SerialName("team_members") val teamMembers: List<BusinessBudgetTeamMemberOut> = emptyList(),
    @SerialName("pending_approvals") val pendingApprovals: List<BusinessBudgetPendingApprovalOut> = emptyList(),
    @SerialName("recent_approvals") val recentApprovals: List<BusinessBudgetPendingApprovalOut> = emptyList(),
    @SerialName("my_submissions") val mySubmissions: List<BusinessBudgetPendingApprovalOut> = emptyList(),
    @SerialName("vendor_balances") val vendorBalances: List<BusinessVendorBalanceOut> = emptyList(),
    val vendors: List<BusinessVendorOut> = emptyList(),
)

@Serializable
data class BusinessBudgetMemberIn(
    val initials: String? = null,
    @SerialName("display_name") val displayName: String,
    val role: String = "employee",
    @SerialName("firebase_uid") val firebaseUid: String? = null,
    val email: String? = null,
    val limit: String? = null,
    val added: Boolean = true,
)

@Serializable
data class BusinessBudgetCreateIn(
    @SerialName("budget_name") val budgetName: String,
    @SerialName("budget_type") val budgetType: String = "operations",
    @SerialName("total_budget") val totalBudget: Double? = null,
    @SerialName("budget_period") val budgetPeriod: String = "Monthly",
    val department: String = "Operations",
    @SerialName("approval_threshold") val approvalThreshold: Double? = null,
    @SerialName("team_members") val teamMembers: List<BusinessBudgetMemberIn> = emptyList(),
    @SerialName("spending_policies") val spendingPolicies: BusinessBudgetPoliciesIn = BusinessBudgetPoliciesIn(),
    @SerialName("reminder_prefs") val reminderPrefs: BusinessBudgetReminderPrefsOut = BusinessBudgetReminderPrefsOut(),
)

@Serializable
data class BusinessBudgetListOut(
    val budgets: List<BusinessBudgetCreateOut> = emptyList(),
)

@Serializable
data class BusinessBudgetPoliciesIn(
    @SerialName("require_receipt_for_all_expenses") val requireReceiptForAllExpenses: Boolean = false,
    @SerialName("auto_approve_below_threshold") val autoApproveBelowThreshold: Boolean = true,
    @SerialName("manager_approval_required") val managerApprovalRequired: Boolean = true,
    @SerialName("notify_admin_on_submission") val notifyAdminOnSubmission: Boolean = true,
    @SerialName("over_budget_alerts") val overBudgetAlerts: Boolean = true,
    @SerialName("lock_budget_when_limit_hit") val lockBudgetWhenLimitHit: Boolean = false,
)

@Serializable
data class BusinessBudgetReminderPrefsOut(
    @SerialName("weekly_digest") val weeklyDigest: Boolean = true,
    @SerialName("pending_approval_alerts") val pendingApprovalAlerts: Boolean = true,
    @SerialName("over_budget_alerts") val overBudgetAlerts: Boolean = true,
    @SerialName("period_close_reminder") val periodCloseReminder: Boolean = true,
)

@Serializable
data class BusinessBudgetReminderPrefsPatchIn(
    @SerialName("weekly_digest") val weeklyDigest: Boolean? = null,
    @SerialName("pending_approval_alerts") val pendingApprovalAlerts: Boolean? = null,
    @SerialName("over_budget_alerts") val overBudgetAlerts: Boolean? = null,
    @SerialName("period_close_reminder") val periodCloseReminder: Boolean? = null,
)

@Serializable
data class BusinessBudgetCategoryOut(
    @SerialName("category_id") val categoryId: String,
    val name: String,
    @SerialName("allocated_amount") val allocatedAmount: Double,
    @SerialName("spent_amount") val spentAmount: Double,
)

@Serializable
data class BusinessCatalogCategoryOut(
    @SerialName("template_category_id") val templateCategoryId: String,
    @SerialName("budget_category_id") val budgetCategoryId: String,
    val name: String,
    @SerialName("entry_kind") val entryKind: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
    val active: Boolean = true,
    val subcategories: List<String> = emptyList(),
)

@Serializable
data class BusinessCatalogOut(
    val expense: List<BusinessCatalogCategoryOut> = emptyList(),
    val purchase: List<BusinessCatalogCategoryOut> = emptyList(),
)

@Serializable
data class BusinessBudgetTeamMemberOut(
    @SerialName("member_id") val memberId: String,
    @SerialName("display_name") val displayName: String,
    val role: String,
    @SerialName("firebase_uid") val firebaseUid: String? = null,
    val email: String? = null,
    @SerialName("spend_limit") val spendLimit: String? = null,
    @SerialName("is_added") val isAdded: Boolean = true,
    @SerialName("invite_status") val inviteStatus: String = "pending",
    @SerialName("joined_at") val joinedAt: String? = null,
)

@Serializable
data class BusinessBudgetPendingApprovalOut(
    @SerialName("approval_id") val approvalId: String,
    val status: String,
    @SerialName("receipt_attached") val receiptAttached: Boolean = false,
)

@Serializable
data class BusinessVendorBalanceOut(
    @SerialName("vendor_name") val vendorName: String,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("paid_amount") val paidAmount: Double = 0.0,
    @SerialName("balance_amount") val balanceAmount: Double = 0.0,
)

@Serializable
data class BusinessVendorOut(
    @SerialName("vendor_id") val vendorId: String,
    @SerialName("vendor_name") val vendorName: String,
)

@Serializable
data class BusinessVendorCreateIn(
    @SerialName("vendor_name") val vendorName: String,
)

@Serializable
data class BusinessVendorPatchIn(
    @SerialName("vendor_name") val vendorName: String,
)

@Serializable
data class BusinessPaymentSplitIn(
    val method: String,
    val amount: Double,
)

@Serializable
data class BusinessExpenseCreateIn(
    val amount: Double,
    @SerialName("category_id") val categoryId: String,
    @SerialName("category_key") val categoryKey: String? = null,
    val title: String = "Expense",
    @SerialName("requester_name") val requesterName: String? = null,
    @SerialName("subcategory_label") val subcategoryLabel: String? = null,
    @SerialName("entry_kind") val entryKind: String? = null,
    @SerialName("paid_mode") val paidMode: String? = null,
    @SerialName("purchase_payment_status") val purchasePaymentStatus: String? = null,
    val quantity: Double? = null,
    val unit: String? = null,
    @SerialName("price_per_unit") val pricePerUnit: Double? = null,
    @SerialName("total_amount") val totalAmount: Double? = null,
    @SerialName("paid_amount") val paidAmount: Double? = null,
    @SerialName("payment_splits") val paymentSplits: List<BusinessPaymentSplitIn> = emptyList(),
    @SerialName("approval_note") val approvalNote: String? = null,
    @SerialName("vendor_name") val vendorName: String? = null,
    @SerialName("invoice_number") val invoiceNumber: String? = null,
    @SerialName("expense_or_purchase") val expenseOrPurchase: String = "expense",
    @SerialName("payment_mode") val paymentMode: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val gstin: String? = null,
    @SerialName("tax_amount") val taxAmount: Double? = null,
    @SerialName("receipt_attached") val receiptAttached: Boolean = false,
)

@Serializable
data class BusinessBudgetCategoryAllocPatchIn(
    @SerialName("category_id") val categoryId: String,
    @SerialName("allocated_amount") val allocatedAmount: Double,
)

@Serializable
data class BusinessBudgetPatchIn(
    @SerialName("budget_name") val budgetName: String? = null,
    @SerialName("budget_period") val budgetPeriod: String? = null,
    @SerialName("total_budget") val totalBudget: Double? = null,
    val department: String? = null,
    @SerialName("approval_threshold") val approvalThreshold: Double? = null,
    @SerialName("spending_policies") val spendingPolicies: BusinessBudgetPoliciesIn? = null,
    @SerialName("reminder_prefs") val reminderPrefs: BusinessBudgetReminderPrefsPatchIn? = null,
    val categories: List<BusinessBudgetCategoryAllocPatchIn>? = null,
)

