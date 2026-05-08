package app.momentra.ui.theme

import androidx.compose.runtime.staticCompositionLocalOf

/** Current [MomentraContext] — matches iOS `@Environment(\.momentraContext)`. Default: Personal. */
val LocalMomentraContext = staticCompositionLocalOf { MomentraContext.Personal }

/** Active Theme Kit runtime for context-aware components. */
val LocalMomentraTheme = staticCompositionLocalOf { MomentraThemeState(MomentraContext.Personal) }
