package app.momentra.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraBase
import app.momentra.ui.theme.MomentraContext

enum class MainTab(val label: String, val defaultIcon: String) {
    Today("Today", "📅"),
    Plan("Plan", "🎯"),
    Activity("Activity", "📋"),
    People("People", "👥"),
    Me("Me", "👤");

    fun iconFor(context: MomentraContext): String = when (this) {
        People -> if (context == MomentraContext.Personal) "📊" else defaultIcon
        else -> defaultIcon
    }

    fun labelFor(context: MomentraContext): String = when (this) {
        People -> if (context == MomentraContext.Personal) "Insights" else label
        else -> label
    }
}

@Composable
fun BottomNavBar(
    selectedTab: MainTab,
    onSelect: (MainTab) -> Unit,
    context: MomentraContext,
    modifier: Modifier = Modifier,
) {
    val theme = DesignTokens.theme(forContext = context)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 10.dp, bottom = 8.dp)
            .background(
                color = MomentraBase.s100.copy(alpha = 0.94f),
                shape = RoundedCornerShape(14.dp),
            ),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MainTab.entries.forEach { tab ->
            val isActive = selectedTab == tab
            val tabColor = if (isActive) theme.accent else theme.tabDim

            TextButton(
                onClick = { onSelect(tab) },
                modifier = Modifier.weight(1f),
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text(
                        text = tab.iconFor(context),
                        fontSize = 16.sp,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = tab.labelFor(context),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.4.sp,
                        color = tabColor,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}
