package app.momentra.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraContextTheme
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit

/**
 * Theme Kit v2.2 Personal "Moment card" row. When the API adds saved amounts to the list payload,
 * pass [savedAmount] and [savedFraction] (0..1) to show "₹X of ₹Y", progress fill, and "% saved" in meta.
 */
@Composable
fun PersonalMomentGoalCard(
    title: String,
    momentType: String?,
    targetAmount: Double?,
    durationType: String?,
    endDate: String?,
    status: String?,
    theme: MomentraContextTheme,
    savedAmount: Double? = null,
    savedFraction: Double? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val badge = personalMomentTypeBadgeLabel(momentType)
    val subline = personalGoalSubline(targetAmount, status, savedAmount)
    val progress = savedFraction?.coerceIn(0.0, 1.0)
    val daysMeta = personalGoalDaysLeftLabel(endDate)
    val pctMeta = progress?.let { "${(it * 100).toInt()}% saved" }
    val metaLine = buildList {
        daysMeta?.let { add(it) }
        pctMeta?.let { add(it) }
        if (daysMeta == null && pctMeta == null && durationType != null) {
            add(personalRhythmLabel(durationType, endDate))
        }
    }.joinToString(" · ").takeIf { it.isNotBlank() }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(DesignTokens.radius.momentCard))
            .background(theme.surface)
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(88.dp)
                .offset(x = 10.dp, y = (-6).dp)
                .clip(CircleShape)
                .background(theme.accent.copy(alpha = 0.25f)),
        )
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = title,
                    color = DesignTokens.base.onDark,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Spacer(modifier = Modifier.padding(start = 8.dp))
                Text(
                    text = badge,
                    color = theme.text,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.dp, theme.text.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                        .background(theme.surface)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
            if (subline.isNotBlank()) {
                Text(
                    text = subline,
                    color = DesignTokens.base.onDark60,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(DesignTokens.base.s200.copy(alpha = 0.45f)),
            ) {
                val frac = (progress ?: 0.0).toFloat().coerceIn(0f, 1f)
                if (frac > 0f) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(frac)
                            .fillMaxHeight()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(theme.accent, theme.accentEnd),
                                ),
                            ),
                    )
                }
            }
            if (metaLine != null) {
                Text(
                    text = metaLine,
                    color = DesignTokens.base.onDark40,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}

internal fun personalMomentTypeBadgeLabel(momentType: String?): String {
    val raw = momentType?.trim()?.uppercase().orEmpty()
    if (raw.isEmpty()) return "GOAL"
    val short = raw.substringBefore('_', raw)
    return short.ifBlank { "GOAL" }
}

internal fun personalGoalSubline(
    targetAmount: Double?,
    status: String?,
    savedAmount: Double?,
): String {
    if (savedAmount != null && targetAmount != null && targetAmount > 0) {
        return "${DesignTokens.formatInr(savedAmount)} of ${DesignTokens.formatInr(targetAmount)}"
    }
    if (targetAmount != null && targetAmount > 0) {
        return "Target · ${DesignTokens.formatInr(targetAmount)}"
    }
    return status?.takeIf { it.isNotBlank() }.orEmpty()
}

internal fun personalGoalDaysLeftLabel(endDate: String?): String? {
    val raw = endDate?.trim().orEmpty()
    if (raw.isEmpty()) return null
    val datePart = raw.take(10)
    return try {
        val end = LocalDate.parse(datePart)
        val today = LocalDate.now()
        val days = ChronoUnit.DAYS.between(today, end)
        when {
            days < 0 -> "${-days} days overdue"
            days == 0L -> "Ends today"
            days == 1L -> "1 day left"
            else -> "$days days left"
        }
    } catch (_: DateTimeParseException) {
        null
    }
}
