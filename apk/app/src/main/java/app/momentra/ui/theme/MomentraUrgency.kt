package app.momentra.ui.theme

import androidx.compose.ui.graphics.Color

/** Urgency system — overrides context colours when needed. */
object MomentraUrgency {
    val high = Color(0xFFE24B4A)
    val highText = Color(0xFFFCA5A5)
    val highSurface = Color(0xFF450A0A)

    val medium = Color(0xFFF59E0B)
    val mediumText = Color(0xFFFDE68A)
    val mediumSurface = Color(0xFF451A00)

    val cta = Color(0xFF10B981)
    val ctaEnd = Color(0xFF34D399)
    val ctaText = Color(0xFFA7F3D0)

    val paidBg = Color(0xFF064E35)
    val paidText = Color(0xFF10B981)

    val pendingBg = Color(0xFF451A00)
    val pendingText = Color(0xFFF59E0B)

    val overdueBg = Color(0xFF450A0A)
    val overdueText = Color(0xFFE24B4A)
}
