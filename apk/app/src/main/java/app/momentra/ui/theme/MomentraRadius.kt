package app.momentra.ui.theme

import androidx.compose.ui.unit.dp

/**
 * Corner radius tokens — pill-heavy system ([momentra_themekit_v2.2.html]).
 * Note: HTML `.mc` moment demo uses 16px; the kit radius table lists 14dp for generic “home” cards — use [card] for those, [momentCard] for goal/moment rows.
 */
object MomentraRadius {
    val data = 4.dp
    val input = 12.dp
    val cardSm = 12.dp
    /** Generic elevated surfaces (demo-card, bottom chrome, sheets chrome). */
    val card = 14.dp
    /** Theme Kit `.mc` personal/group moment row corners. */
    val momentCard = 16.dp
    /** Inner context tab segment (`.ctx-btn` rounded rect, not full pill). */
    val contextTabInner = 10.dp
    val button = 14.dp
    val hero = 18.dp
    val pill = 999.dp
}
