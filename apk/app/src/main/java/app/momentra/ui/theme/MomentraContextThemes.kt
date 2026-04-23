package app.momentra.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Per-context theme surfaces and gradients — parity with iOS `ContextTheme.theme(for:)`.
 */
data class MomentraContextTheme(
    val cover: Color,
    val surface: Color,
    val accent: Color,
    val accentEnd: Color,
    val text: Color,
    val hero: Color,
    val tabBg: Color,
    val tabDim: Color,
    val headerBrush: Brush,
    val ctaBrush: Brush,
    val orbOpacity: Float,
)

object MomentraContextThemes {
    private val screenBg = MomentraBase.bg

    fun themeFor(context: MomentraContext): MomentraContextTheme = when (context) {
        MomentraContext.Personal -> MomentraContextTheme(
            cover = PersonalColors.cover,
            surface = PersonalColors.surface,
            accent = PersonalColors.accent,
            accentEnd = PersonalColors.accentEnd,
            text = PersonalColors.text,
            hero = PersonalColors.hero,
            tabBg = PersonalColors.tabBg,
            tabDim = PersonalColors.tabDim,
            headerBrush = Brush.verticalGradient(listOf(PersonalColors.cover, screenBg)),
            ctaBrush = Brush.horizontalGradient(listOf(PersonalColors.accent, PersonalColors.accentEnd)),
            orbOpacity = 0.25f,
        )
        MomentraContext.Group -> MomentraContextTheme(
            cover = GroupColors.cover,
            surface = GroupColors.surface,
            accent = GroupColors.accent,
            accentEnd = GroupColors.accentEnd,
            text = GroupColors.text,
            hero = GroupColors.hero,
            tabBg = GroupColors.tabBg,
            tabDim = GroupColors.tabDim,
            headerBrush = Brush.verticalGradient(listOf(GroupColors.cover, screenBg)),
            ctaBrush = Brush.horizontalGradient(listOf(GroupColors.accent, GroupColors.accentEnd)),
            orbOpacity = GroupColors.orbOpacity,
        )
        MomentraContext.Business -> MomentraContextTheme(
            cover = BusinessColors.cover,
            surface = BusinessColors.surface,
            accent = BusinessColors.accent,
            accentEnd = BusinessColors.accentEnd,
            text = BusinessColors.text,
            hero = BusinessColors.hero,
            tabBg = BusinessColors.tabBg,
            tabDim = BusinessColors.tabDim,
            headerBrush = Brush.verticalGradient(listOf(BusinessColors.cover, screenBg)),
            ctaBrush = Brush.horizontalGradient(listOf(BusinessColors.accent, BusinessColors.accentEnd)),
            orbOpacity = 0.25f,
        )
        MomentraContext.Circle -> MomentraContextTheme(
            cover = CircleColors.cover,
            surface = CircleColors.surface,
            accent = CircleColors.accent,
            accentEnd = CircleColors.accentEnd,
            text = CircleColors.text,
            hero = CircleColors.hero,
            tabBg = CircleColors.tabBg,
            tabDim = CircleColors.tabDim,
            headerBrush = Brush.verticalGradient(listOf(CircleColors.cover, screenBg)),
            ctaBrush = Brush.horizontalGradient(listOf(CircleColors.accent, CircleColors.accentEnd)),
            orbOpacity = 0.25f,
        )
    }
}
