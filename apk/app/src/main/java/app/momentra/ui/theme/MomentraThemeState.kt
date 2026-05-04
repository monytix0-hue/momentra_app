package app.momentra.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember

/**
 * Runtime theme state for the active Momentra context.
 *
 * Components should read this via [LocalMomentraTheme] instead of resolving
 * context tokens ad hoc. That keeps Theme Kit rules in one place.
 */
data class MomentraThemeState(
    val context: MomentraContext,
    val contextTheme: MomentraContextTheme = DesignTokens.theme(forContext = context),
) {
    val screenBackground = MomentraBase.bg
    val ctaText = MomentraSemantic.ctaText

    fun actionStyle(
        status: String? = null,
        role: DesignTokens.ActionRole = DesignTokens.ActionRole.Primary,
    ): DesignTokens.ActionStyle = DesignTokens.actionStyle(
        context = context,
        status = status,
        role = role,
    )

    fun budgetBarColor(pctUsed: Float) =
        if (pctUsed >= 0.85f) MomentraUrgency.high else contextTheme.accent
}

@Composable
fun rememberMomentraThemeState(context: MomentraContext): MomentraThemeState {
    return remember(context) { MomentraThemeState(context) }
}

@Composable
fun ProvideMomentraTheme(
    context: MomentraContext,
    content: @Composable () -> Unit,
) {
    val state = rememberMomentraThemeState(context)
    CompositionLocalProvider(
        LocalMomentraContext provides context,
        LocalMomentraTheme provides state,
        content = content,
    )
}
