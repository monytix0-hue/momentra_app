package app.momentra.ui.home

import app.momentra.network.GroupSplitMode
import app.momentra.ui.theme.MomentraContext
import java.util.Calendar

/** API contract for [app.momentra.network.PersonalMomentCreateIn.durationType]. */
object PersonalMomentDuration {
    const val RECURRING_MONTHLY = "recurring_monthly"
    const val FIXED_END = "fixed_end"
}

data class PersonalQuickTemplate(
    val title: String,
    val subtitle: String,
    val momentType: String = "goal",
    val durationType: String,
    val targetAmount: Double? = null,
    val savingMode: String? = null,
    val description: String? = null,
    val endDateIso: String? = null,
    val startDateIso: String? = null,
)

data class GroupQuickTemplate(
    val title: String,
    val subtitle: String,
    val momentType: String = "trip_fund",
    val splitMode: String = GroupSplitMode.EQUAL,
    val targetAmount: Double? = null,
    val destination: String? = null,
    val tripStartDateIso: String? = null,
    val tripEndDateIso: String? = null,
)

data class BusinessQuickTemplate(
    val budgetName: String,
    val subtitle: String,
    val budgetType: String = "operations",
    val totalBudget: Double? = null,
    val budgetPeriod: String = "Monthly",
    val department: String = "Operations",
    val approvalThreshold: Double? = null,
)

sealed class HomeEmptyTemplate {
    data class Simple(val label: String) : HomeEmptyTemplate()
    data class WithPreset(val preset: PersonalQuickTemplate) : HomeEmptyTemplate()
    data class WithGroupPreset(val preset: GroupQuickTemplate) : HomeEmptyTemplate()
    data class WithBusinessPreset(val preset: BusinessQuickTemplate) : HomeEmptyTemplate()
}

fun homeEmptyTemplates(context: MomentraContext): List<HomeEmptyTemplate> = when (context) {
    MomentraContext.Personal -> listOf(
        HomeEmptyTemplate.WithPreset(
            PersonalQuickTemplate(
                title = "Emergency Fund",
                subtitle = "Build a cushion over time",
                durationType = PersonalMomentDuration.RECURRING_MONTHLY,
                savingMode = "monthly",
                targetAmount = 50_000.0,
                description = "Safety net for unexpected expenses",
            ),
        ),
        HomeEmptyTemplate.WithPreset(
            PersonalQuickTemplate(
                title = "Monthly Bills",
                subtitle = "Recurring household bills",
                durationType = PersonalMomentDuration.RECURRING_MONTHLY,
                savingMode = "monthly",
                description = "Rent, utilities, subscriptions",
            ),
        ),
        HomeEmptyTemplate.WithPreset(
            PersonalQuickTemplate(
                title = "Travel Savings",
                subtitle = "Save toward a trip",
                durationType = PersonalMomentDuration.FIXED_END,
                savingMode = "monthly",
                description = "Vacation fund with an end date",
                endDateIso = null,
            ),
        ),
    )
    MomentraContext.Group -> listOf(
        HomeEmptyTemplate.WithGroupPreset(
            GroupQuickTemplate(
                title = "Trip Split",
                subtitle = "Shared travel fund — split evenly",
                momentType = "trip_fund",
                splitMode = GroupSplitMode.EQUAL,
                destination = "Trip",
            ),
        ),
        HomeEmptyTemplate.WithGroupPreset(
            GroupQuickTemplate(
                title = "House Expenses",
                subtitle = "Rent & utilities — by percent",
                momentType = "trip_fund",
                splitMode = GroupSplitMode.PERCENT,
            ),
        ),
        HomeEmptyTemplate.WithGroupPreset(
            GroupQuickTemplate(
                title = "Event Planning",
                subtitle = "Parties & tickets — by shares",
                momentType = "trip_fund",
                splitMode = GroupSplitMode.SHARES,
            ),
        ),
    )
    MomentraContext.Business -> listOf(
        HomeEmptyTemplate.WithBusinessPreset(
            BusinessQuickTemplate(
                budgetName = "Retail Store - Monthly Ops",
                subtitle = "Track daily expenses, stock, and staff costs",
                budgetType = "operations",
                totalBudget = 120_000.0,
                budgetPeriod = "Monthly",
                department = "Store Operations",
                approvalThreshold = 2000.0,
            ),
        ),
        HomeEmptyTemplate.WithBusinessPreset(
            BusinessQuickTemplate(
                budgetName = "Cold Pressed Oils - Procurement",
                subtitle = "Seeds, packaging, and transport purchases",
                budgetType = "procurement",
                totalBudget = 180_000.0,
                budgetPeriod = "Monthly",
                department = "Procurement",
                approvalThreshold = 5000.0,
            ),
        ),
        HomeEmptyTemplate.WithBusinessPreset(
            BusinessQuickTemplate(
                budgetName = "Multi Store - Vendor Payments",
                subtitle = "Vendor dues with admin approval workflow",
                budgetType = "vendor_payments",
                totalBudget = 350_000.0,
                budgetPeriod = "Monthly",
                department = "Finance",
                approvalThreshold = 7000.0,
            ),
        ),
    )
    MomentraContext.Circle -> listOf(
        HomeEmptyTemplate.Simple("Community Goals"),
        HomeEmptyTemplate.Simple("Neighborhood Events"),
        HomeEmptyTemplate.Simple("Creator Pods"),
    )
}

fun calendarDateIso(): String {
    val c = Calendar.getInstance()
    return isoFromCalendar(c)
}

fun calendarDateIsoPlusYears(years: Int): String {
    val c = Calendar.getInstance()
    c.add(Calendar.YEAR, years)
    return isoFromCalendar(c)
}

private fun isoFromCalendar(c: Calendar): String {
    val y = c.get(Calendar.YEAR)
    val m = c.get(Calendar.MONTH) + 1
    val d = c.get(Calendar.DAY_OF_MONTH)
    return String.format("%04d-%02d-%02d", y, m, d)
}

fun millisToIsoDateUtc(millis: Long): String {
    val c = Calendar.getInstance()
    c.timeInMillis = millis
    return isoFromCalendar(c)
}

fun personalRhythmLabel(durationType: String, endDate: String?): String = when (durationType) {
    PersonalMomentDuration.RECURRING_MONTHLY -> "Monthly"
    PersonalMomentDuration.FIXED_END -> endDate?.let { "Ends $it" } ?: "Fixed end"
    else -> durationType
}

fun groupSplitLabel(mode: String): String = when (mode.lowercase()) {
    GroupSplitMode.EQUAL -> "Equal split"
    GroupSplitMode.EXACT -> "Exact amounts"
    GroupSplitMode.PERCENT -> "Split by percent"
    GroupSplitMode.SHARES -> "Split by shares"
    else -> mode.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}
