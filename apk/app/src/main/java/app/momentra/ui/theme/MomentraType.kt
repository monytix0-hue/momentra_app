package app.momentra.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Typography scale — Plus Jakarta Sans via [FontFamily] supplied by [MomentraTheme].
 * Sizes and weights match iOS [MomentraType].
 */
object MomentraType {
    val display = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 32.sp,
        letterSpacing = (-0.5).sp
    )

    val titleXL = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold)
    val titleLG = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
    val titleMD = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
    val titleSM = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.SemiBold)

    val body = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
    val bodyMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium)

    val caption = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Normal)
    /** Context switcher labels — kit `.ctx-btn` 12px / 500. */
    val contextTab = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium)
    val label = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
    val micro = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
    val nano = TextStyle(fontSize = 9.sp, fontWeight = FontWeight.Medium)
}
