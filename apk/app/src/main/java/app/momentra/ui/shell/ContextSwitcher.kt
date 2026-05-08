package app.momentra.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraBase
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraContextTheme
import app.momentra.ui.theme.LocalMomentraContext

data class ContextTab(
    val context: MomentraContext,
    val label: String,
)

private val ALL_CONTEXTS = listOf(
    ContextTab(MomentraContext.Personal, "Personal"),
    ContextTab(MomentraContext.Group, "Group"),
    ContextTab(MomentraContext.Business, "Business"),
    ContextTab(MomentraContext.Circle, "Circle"),
)

@Composable
fun ContextSwitcher(
    selectedContext: MomentraContext,
    onSelect: (MomentraContext) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 0.dp)
            .padding(top = 8.dp, bottom = 0.dp),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        // Outer pill container
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(14.dp))
                .background(MomentraBase.s100.copy(alpha = 0.97f))
                .padding(6.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(0.dp)) {
                ALL_CONTEXTS.forEach { tab ->
                    val theme = DesignTokens.theme(forContext = tab.context)
                    val isSelected = tab.context == selectedContext
                    val bgColor = if (isSelected) theme.surface else theme.tabBg.copy(alpha = 0.9f)
                    val textColor = if (isSelected) theme.text else MomentraBase.onDark.copy(alpha = 0.38f)

                    TextButton(
                        onClick = { onSelect(tab.context) },
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(bgColor),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(theme.accent)
                            )
                            Text(
                                text = tab.label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                letterSpacing = 0.4.sp,
                                color = textColor,
                            )
                        }
                    }
                }
            }
        }
    }
}
