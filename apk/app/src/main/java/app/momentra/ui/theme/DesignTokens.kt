package app.momentra.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import java.text.NumberFormat
import java.util.Locale

/**
 * Unified entry point for design tokens (parity with iOS `DesignTokens`).
 */
object DesignTokens {
    val base = MomentraBase
    val urgency = MomentraUrgency
    val personal = PersonalColors
    val group = GroupColors
    val business = BusinessColors
    val circle = CircleColors
    val splash = SplashColors
    val avatar = AvatarColors
    val semantic = MomentraSemantic

    val spacing = MomentraSpacing
    val radius = MomentraRadius
    val sizing = MomentraSizing
    val type = MomentraType
    val anim = MomentraAnim
    val icon = MomentraIconSizing

    /** Same role as iOS `DesignTokens.theme(for:)`. */
    fun theme(forContext: MomentraContext): MomentraContextTheme =
        MomentraContextThemes.themeFor(forContext)

    enum class UrgencyLevel { Clear, Medium, High }
    enum class ActionRole { Primary, RemindOverdue }

    data class ActionStyle(
        val solid: Color,
        val solidAlt: Color,
        val gradientStart: Color,
        val gradientEnd: Color,
        val text: Color,
    )

    fun urgencyLevelForStatus(status: String?): UrgencyLevel {
        val normalized = status?.trim()?.lowercase().orEmpty()
        return when {
            normalized.contains("overdue") || normalized.contains("high") || normalized.contains("late") -> UrgencyLevel.High
            normalized.contains("medium") || normalized.contains("warning") || normalized.contains("due_soon") -> UrgencyLevel.Medium
            else -> UrgencyLevel.Clear
        }
    }

    fun actionStyle(
        context: MomentraContext,
        status: String?,
        role: ActionRole = ActionRole.Primary,
    ): ActionStyle {
        val level = urgencyLevelForStatus(status)
        val forceUrgencyCta = role == ActionRole.RemindOverdue || level != UrgencyLevel.Clear
        return if (forceUrgencyCta) {
            ActionStyle(
                solid = urgency.cta,
                solidAlt = urgency.ctaEnd,
                gradientStart = urgency.cta,
                gradientEnd = urgency.ctaEnd,
                text = semantic.ctaText,
            )
        } else {
            val theme = theme(forContext = context)
            ActionStyle(
                solid = theme.accent,
                solidAlt = theme.accentEnd,
                gradientStart = theme.accent,
                gradientEnd = theme.accentEnd,
                text = semantic.ctaText,
            )
        }
    }

    /** INR display — parity with iOS `DesignTokens.formatInr`. */
    fun formatInr(amount: Double): String {
        val nf = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
        return nf.format(amount)
    }

    /** Compact INR for hero cards — parity with iOS `DesignTokens.formatInrDisplay`. */
    fun formatInrDisplay(amount: Double): String {
        val absAmount = kotlin.math.abs(amount)
        return when {
            absAmount >= 10_000_000 ->
                String.format(Locale.US, "₹%.1fCr", absAmount / 10_000_000)
            absAmount >= 100_000 ->
                String.format(Locale.US, "₹%.1fL", absAmount / 100_000)
            absAmount >= 1_000 ->
                String.format(Locale.US, "₹%.1fk", absAmount / 1_000)
            else -> {
                val nf = NumberFormat.getNumberInstance(Locale("en", "IN"))
                nf.maximumFractionDigits = 0
                "₹${nf.format(absAmount)}"
            }
        }
    }
}

object MomentraIconSizing {
    val xs: Dp = 12.dp
    val sm: Dp = 16.dp
    val md: Dp = 20.dp
    val lg: Dp = 24.dp
}
