package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PersonalMomentItemOut(
    @SerialName("moment_id") val momentId: String,
    val title: String,
    @SerialName("moment_type") val momentType: String,
    @SerialName("duration_type") val durationType: String,
    val status: String,
    @SerialName("target_amount") val targetAmount: Double? = null,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    val description: String? = null,
    @SerialName("saving_mode") val savingMode: String? = null,
    @SerialName("is_private_moment") val isPrivateMoment: Boolean = true,
    @SerialName("saved_amount") val savedAmount: Double? = null,
)

@Serializable
data class PersonalMomentListResponse(
    val moments: List<PersonalMomentItemOut> = emptyList(),
)

@Serializable
data class PersonalAccountOut(
    @SerialName("account_id") val accountId: String,
    val name: String,
    @SerialName("account_type") val accountType: String,
    @SerialName("icon_emoji") val iconEmoji: String? = null,
    @SerialName("color_hex") val colorHex: String? = null,
    val balance: Double = 0.0,
)

@Serializable
data class PersonalHomeOut(
    @SerialName("net_balance") val netBalance: Double = 0.0,
    @SerialName("month_spend") val monthSpend: Double = 0.0,
    @SerialName("month_income") val monthIncome: Double = 0.0,
    @SerialName("budget_spent") val budgetSpent: Double = 0.0,
    @SerialName("budget_cap") val budgetCap: Double = 0.0,
    val accounts: List<PersonalAccountOut> = emptyList(),
    val recent: List<PersonalTransactionOut> = emptyList(),
)

@Serializable
data class PersonalTransactionOut(
    @SerialName("transaction_id") val transactionId: String,
    val title: String,
    val subtitle: String,
    val amount: Double,
    @SerialName("is_income") val isIncome: Boolean,
    val category: String? = null,
    @SerialName("subcategory_id") val subcategoryId: String? = null,
    @SerialName("subcategory_label") val subcategoryLabel: String? = null,
    @SerialName("account_name") val accountName: String? = null,
    val emoji: String? = null,
    val note: String? = null,
    @SerialName("txn_date") val txnDate: String? = null,
)

@Serializable
data class PersonalTransactionListOut(
    val transactions: List<PersonalTransactionOut> = emptyList(),
)

@Serializable
data class PersonalSubcategoryOut(
    @SerialName("subcategory_id") val subcategoryId: String,
    val name: String,
)

@Serializable
data class PersonalCategoryOut(
    @SerialName("category_id") val categoryId: String,
    val kind: String,
    val name: String,
    @SerialName("icon_emoji") val iconEmoji: String? = null,
    val subcategories: List<PersonalSubcategoryOut> = emptyList(),
)

@Serializable
data class PersonalCategoryListOut(
    val categories: List<PersonalCategoryOut> = emptyList(),
)

@Serializable
data class PersonalTransactionCreateIn(
    @SerialName("is_income") val isIncome: Boolean,
    val amount: Double,
    val category: String,
    @SerialName("subcategory_id") val subcategoryId: String? = null,
    @SerialName("subcategory_label") val subcategoryLabel: String? = null,
    @SerialName("account_id") val accountId: String? = null,
    val title: String? = null,
    val note: String? = null,
    @SerialName("txn_date") val txnDate: String? = null,
)

@Serializable
data class PersonalTransactionPatchIn(
    @SerialName("is_income") val isIncome: Boolean? = null,
    val amount: Double? = null,
    val category: String? = null,
    @SerialName("subcategory_id") val subcategoryId: String? = null,
    @SerialName("subcategory_label") val subcategoryLabel: String? = null,
    @SerialName("account_id") val accountId: String? = null,
    val title: String? = null,
    val note: String? = null,
    @SerialName("txn_date") val txnDate: String? = null,
)

@Serializable
data class PersonalMomentPatchIn(
    val title: String? = null,
    @SerialName("target_amount") val targetAmount: Double? = null,
    @SerialName("duration_type") val durationType: String? = null,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    val description: String? = null,
    @SerialName("saving_mode") val savingMode: String? = null,
    @SerialName("is_private_moment") val isPrivateMoment: Boolean? = null,
)

@Serializable
data class PersonalMomentMilestoneIn(
    val title: String,
    val meta: String? = null,
)

@Serializable
data class PersonalMomentCreateIn(
    val title: String,
    @SerialName("moment_type") val momentType: String,
    @SerialName("duration_type") val durationType: String,
    @SerialName("target_amount") val targetAmount: Double? = null,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    @SerialName("saving_mode") val savingMode: String? = null,
    val description: String? = null,
    val milestones: List<PersonalMomentMilestoneIn> = emptyList(),
    val status: String = "active",
    @SerialName("is_private_moment") val isPrivateMoment: Boolean = true,
    @SerialName("weekly_reminders") val weeklyReminders: Boolean = true,
    @SerialName("milestone_alerts") val milestoneAlerts: Boolean = true,
    @SerialName("low_velocity_warning") val lowVelocityWarning: Boolean = false,
    @SerialName("auto_archive_on_complete") val autoArchiveOnComplete: Boolean = true,
    @SerialName("notify_via_push") val notifyViaPush: Boolean = true,
    @SerialName("notify_via_whatsapp") val notifyViaWhatsapp: Boolean = false,
    @SerialName("notify_via_email") val notifyViaEmail: Boolean = true,
)

@Serializable
data class PersonalMomentCreateOut(
    @SerialName("moment_id") val momentId: String,
    val title: String,
    @SerialName("moment_type") val momentType: String,
    @SerialName("duration_type") val durationType: String,
)

