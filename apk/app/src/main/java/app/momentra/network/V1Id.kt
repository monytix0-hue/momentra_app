package app.momentra.network

import app.momentra.ui.theme.MomentraContext

/**
 * Maps a legacy moment id to the `/v1/moments/...` external id (`p_` / `g_` / `b_`).
 * [MomentraContext.Circle] has no v1 moment surface; returns null.
 */
fun v1MomentIdOrNull(context: MomentraContext, rawId: String): String? {
    val id = rawId.trim()
    if (id.isEmpty() || context == MomentraContext.Circle) return null
    val prefix = when (context) {
        MomentraContext.Personal -> "p_"
        MomentraContext.Group -> "g_"
        MomentraContext.Business -> "b_"
        MomentraContext.Circle -> return null
    }
    return "$prefix$id"
}
