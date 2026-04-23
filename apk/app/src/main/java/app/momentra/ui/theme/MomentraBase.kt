package app.momentra.ui.theme

import androidx.compose.ui.graphics.Color

/** Base colors used across all contexts (Momentra Theme Kit v2.2). */
object MomentraBase {
    val bg = Color(0xFF120F20)
    val s100 = Color(0xFF1A1728)
    val s200 = Color(0xFF241F38)
    val s300 = Color(0xFF302A48)

    val brandDeep = Color(0xFF2D1F5E)
    val brand = Color(0xFF6C4EF2)
    val brandLight = Color(0xFF8B6FF5)
    val brandText = Color(0xFFC4B5FD)

    val onDark = Color(0xFFF5F0FF)
    val onDark80 = onDark.copy(alpha = 0.8f)
    val onDark60 = onDark.copy(alpha = 0.6f)
    val onDark40 = onDark.copy(alpha = 0.4f)
    val onDark20 = onDark.copy(alpha = 0.2f)
}
