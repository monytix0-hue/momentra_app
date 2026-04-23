package app.momentra.ui.theme

import androidx.compose.ui.graphics.Color

/** Avatar variant colours for user initials. */
object AvatarColors {
    val warmBg = Color(0xFFFAEEDA)
    val warmText = Color(0xFF633806)

    val deepBg = Color(0xFFEEEDFE)
    val deepText = Color(0xFF3C3489)

    val goBg = Color(0xFFE1F5EE)
    val goText = Color(0xFF085041)

    fun variantFor(index: Int): Pair<Color, Color> = when (index % 3) {
        0 -> warmBg to warmText
        1 -> deepBg to deepText
        else -> goBg to goText
    }
}
