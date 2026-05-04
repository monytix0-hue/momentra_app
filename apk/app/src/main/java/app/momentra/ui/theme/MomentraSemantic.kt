package app.momentra.ui.theme

import androidx.compose.ui.graphics.Color

/** Semantic roles that sit above raw color primitives. */
object MomentraSemantic {
    /** Theme kit v2.2 rule: all CTA labels use white text. */
    val ctaText = Color.White

    /** Neutral light surface used where dark QR modules must remain high contrast. */
    val qrSurface = MomentraBase.onDark
}
