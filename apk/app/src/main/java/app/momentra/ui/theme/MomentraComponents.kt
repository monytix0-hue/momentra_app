package app.momentra.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun MomentraScreenChrome(
    context: MomentraContext,
    modifier: Modifier = Modifier,
    headerHeight: Dp = 160.dp,
    orbSize: Dp = 420.dp,
    orbOffsetY: Dp = 0.dp,
    orbExtraOpacity: Float = 0.08f,
    content: @Composable BoxScope.(MomentraThemeState) -> Unit,
) {
    ProvideMomentraTheme(context = context) {
        val runtime = LocalMomentraTheme.current
        val theme = runtime.contextTheme
        Box(
            modifier = modifier
                .background(runtime.screenBackground),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(headerHeight)
                    .background(theme.headerBrush),
            )
            Box(
                modifier = Modifier
                    .size(orbSize)
                    .align(Alignment.TopCenter)
                    .offset(y = orbOffsetY)
                    .clip(CircleShape)
                    .background(theme.accent.copy(alpha = (theme.orbOpacity + orbExtraOpacity).coerceAtMost(0.42f))),
            )
            content(runtime)
        }
    }
}

@Composable
fun MomentraContextTabs(
    selectedContext: MomentraContext,
    onSelect: (MomentraContext) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(DesignTokens.radius.card))
            .background(DesignTokens.base.s100)
            .alpha(0.97f)
            .padding(DesignTokens.spacing.inline)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.spacing.inline),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MomentraContext.entries.forEach { context ->
            val ctxTheme = DesignTokens.theme(forContext = context)
            val selected = selectedContext == context
            val innerShape = RoundedCornerShape(DesignTokens.radius.contextTabInner)
            Row(
                modifier = Modifier
                    .clip(innerShape)
                    .background(if (selected) ctxTheme.surface else ctxTheme.tabBg.copy(alpha = 0.9f))
                    .clickable { onSelect(context) }
                    .padding(
                        horizontal = DesignTokens.spacing.screenV,
                        vertical = DesignTokens.spacing.contextTabPadV,
                    ),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(7.dp)
                        .clip(CircleShape)
                        .background(ctxTheme.accent),
                )
                Text(
                    text = context.displayName,
                    style = DesignTokens.type.contextTab,
                    color = if (selected) ctxTheme.text else DesignTokens.base.onDark.copy(alpha = 0.38f),
                )
            }
        }
    }
}

@Composable
fun MomentraCard(
    modifier: Modifier = Modifier,
    background: Color = DesignTokens.base.s100,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(DesignTokens.radius.card))
            .background(background)
            .padding(DesignTokens.spacing.cardH),
    ) {
        content()
    }
}

@Composable
fun MomentraPrimaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    actionStyle: DesignTokens.ActionStyle? = null,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val resolvedStyle = actionStyle ?: LocalMomentraTheme.current.actionStyle()
    val brush = Brush.horizontalGradient(listOf(resolvedStyle.gradientStart, resolvedStyle.gradientEnd))
    val btnShape = RoundedCornerShape(DesignTokens.radius.button)
    val interactive = enabled && !loading
    Box(
        modifier = modifier
            .clip(btnShape)
            .background(if (enabled) brush else Brush.horizontalGradient(listOf(DesignTokens.base.s200, DesignTokens.base.s200)))
            .border(
                width = 0.5.dp,
                color = resolvedStyle.gradientStart.copy(alpha = if (enabled) 0.35f else 0.12f),
                shape = btnShape,
            )
            .clickable(enabled = interactive, onClick = onClick)
            .padding(
                horizontal = DesignTokens.spacing.screenV,
                vertical = DesignTokens.spacing.section,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = resolvedStyle.text,
                strokeWidth = 2.dp,
            )
        } else {
            Text(
                text = label,
                color = resolvedStyle.text,
                style = DesignTokens.type.label,
            )
        }
    }
}

/** Theme Kit ghost CTA — gradient border tone from [borderColor]. */
@Composable
fun MomentraGhostButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    borderColor: Color,
    contentColor: Color,
    enabled: Boolean = true,
) {
    val shape = RoundedCornerShape(DesignTokens.radius.button)
    Text(
        text = label,
        style = DesignTokens.type.bodyMedium,
        color = contentColor.copy(alpha = if (enabled) 1f else MomentraAnim.disabled),
        modifier = modifier
            .clip(shape)
            .border(1.5.dp, borderColor.copy(alpha = if (enabled) 1f else 0.35f), shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 11.dp),
    )
}

/** Hairline stroke on dark surfaces (Theme Kit 0.5px borders). */
fun Modifier.momentraHairlineBorder(
    shape: Shape,
    color: Color = DesignTokens.base.s300,
): Modifier = border(0.5.dp, color.copy(alpha = 0.5f), shape)

/** Activity / small list row surface (12dp radius + hairline). */
fun Modifier.momentraListRowSurface(cornerRadius: Dp = DesignTokens.radius.cardSm): Modifier {
    val shape = RoundedCornerShape(cornerRadius)
    return clip(shape)
        .background(DesignTokens.base.s100)
        .momentraHairlineBorder(shape)
}

/**
 * Generic elevated surface (Theme Kit demo-card): [radius.card], [s100], optional hairline, inner [cardH] padding.
 */
@Composable
fun MomentraElevatedCard(
    modifier: Modifier = Modifier,
    background: Color = DesignTokens.base.s100,
    cornerRadius: Dp = DesignTokens.radius.card,
    contentPadding: Dp = DesignTokens.spacing.cardH,
    withHairline: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(cornerRadius)
    Column(
        modifier = modifier
            .clip(shape)
            .background(background)
            .then(if (withHairline) Modifier.momentraHairlineBorder(shape) else Modifier)
            .padding(contentPadding),
        content = content,
    )
}

/** List row with Theme Kit surface; inner padding after chrome. */
@Composable
fun MomentraSurfaceListRow(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .momentraListRowSurface()
            .padding(DesignTokens.spacing.section),
        content = content,
    )
}

@Composable
fun MomentraStatusBadge(
    label: String,
    background: Color,
    textColor: Color,
    modifier: Modifier = Modifier,
) {
    Text(
        text = label,
        color = textColor,
        style = DesignTokens.type.micro,
        modifier = modifier
            .clip(RoundedCornerShape(DesignTokens.radius.pill))
            .background(background)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
fun MomentraProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = LocalMomentraTheme.current.contextTheme.accent,
) {
    LinearProgressIndicator(
        progress = { progress.coerceIn(0f, 1f) },
        color = color,
        trackColor = LocalMomentraTheme.current.contextTheme.surface,
        modifier = modifier
            .fillMaxWidth()
            .height(DesignTokens.sizing.barHeight)
            .clip(RoundedCornerShape(DesignTokens.radius.pill)),
    )
}

@Composable
fun MomentraBudgetBar(
    pctUsed: Float,
    modifier: Modifier = Modifier,
) {
    val runtime = LocalMomentraTheme.current
    MomentraProgressBar(
        progress = pctUsed,
        color = runtime.budgetBarColor(pctUsed),
        modifier = modifier,
    )
}
