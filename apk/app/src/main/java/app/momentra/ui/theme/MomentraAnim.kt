package app.momentra.ui.theme

import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.tween

/** Animation tokens (durations in ms for [tween]). */
object MomentraAnim {
    const val instantMs = 100
    const val fastMs = 150
    const val normalMs = 200
    const val mediumMs = 350
    const val ringMs = 900
    const val triggerMs = 2000

    val standard: AnimationSpec<Float> = tween(normalMs)
    val springStiffness = 1f
    val springDamping = 0.8f

    const val rowDone = 0.5f
    const val disabled = 0.4f
}
