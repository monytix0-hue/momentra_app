package app.momentra.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import app.momentra.R

private fun momentraDarkColorScheme(): ColorScheme = darkColorScheme(
    primary = MomentraBase.brand,
    onPrimary = MomentraSemantic.ctaText,
    primaryContainer = MomentraBase.brandDeep,
    onPrimaryContainer = MomentraBase.onDark,
    secondary = MomentraBase.brandLight,
    onSecondary = MomentraSemantic.ctaText,
    tertiary = PersonalColors.accentEnd,
    onTertiary = MomentraSemantic.ctaText,
    background = MomentraBase.bg,
    onBackground = MomentraBase.onDark,
    surface = MomentraBase.s100,
    onSurface = MomentraBase.onDark,
    surfaceVariant = MomentraBase.s200,
    onSurfaceVariant = MomentraBase.brandText,
    outline = MomentraBase.s300,
    error = MomentraUrgency.high,
    onError = MomentraSemantic.ctaText
)

@Composable
private fun rememberMomentraFontFamily(): FontFamily {
    return remember {
        FontFamily(
            Font(R.font.plus_jakarta_sans_regular, FontWeight.Normal),
            Font(R.font.plus_jakarta_sans_medium, FontWeight.Medium),
            Font(R.font.plus_jakarta_sans_semibold, FontWeight.SemiBold),
            Font(R.font.plus_jakarta_sans_bold, FontWeight.Bold)
        )
    }
}

private fun TextStyle.withFont(fontFamily: FontFamily): TextStyle = copy(fontFamily = fontFamily)

@Composable
private fun momentraTypography(fontFamily: FontFamily): Typography {
    return Typography(
        displayLarge = MomentraType.display.withFont(fontFamily),
        headlineLarge = MomentraType.titleXL.withFont(fontFamily),
        headlineMedium = MomentraType.titleLG.withFont(fontFamily),
        headlineSmall = MomentraType.titleMD.withFont(fontFamily),
        titleLarge = MomentraType.titleSM.withFont(fontFamily),
        titleMedium = MomentraType.bodyMedium.withFont(fontFamily),
        bodyLarge = MomentraType.body.withFont(fontFamily),
        bodyMedium = MomentraType.bodyMedium.withFont(fontFamily),
        bodySmall = MomentraType.caption.withFont(fontFamily),
        labelLarge = MomentraType.label.withFont(fontFamily),
        labelMedium = MomentraType.micro.withFont(fontFamily),
        labelSmall = MomentraType.nano.withFont(fontFamily)
    )
}

@Composable
fun MomentraTheme(
    momentraContext: MomentraContext = MomentraContext.Personal,
    content: @Composable () -> Unit
) {
    val fontFamily = rememberMomentraFontFamily()
    val colorScheme = momentraDarkColorScheme()
    val typography = momentraTypography(fontFamily)

    CompositionLocalProvider(LocalMomentraContext provides momentraContext) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = typography,
            content = content
        )
    }
}
