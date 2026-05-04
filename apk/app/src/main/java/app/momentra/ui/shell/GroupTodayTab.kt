package app.momentra.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.LocalMomentraTheme
import app.momentra.ui.theme.MomentraBase

@Composable
fun GroupTodayTab(
    groupId: String? = null,
) {
    val theme = LocalMomentraTheme.current.contextTheme

    Column(modifier = Modifier.fillMaxWidth()) {
        // Title
        Text(
            text = "Group · Today",
            style = DesignTokens.type.titleXL,
            color = MomentraBase.onDark,
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "Track shared expenses with your group.",
            style = DesignTokens.type.caption,
            color = MomentraBase.onDark60,
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Action Row — 2 buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            GroupActionButton(
                label = "New group",
                icon = "➕",
                isPrimary = true,
                theme = theme,
                modifier = Modifier.weight(1f),
            )
            GroupActionButton(
                label = "Add expense",
                icon = "💸",
                isPrimary = false,
                theme = theme,
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Empty state
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(MomentraBase.s200.copy(alpha = 0.5f))
                .border(1.dp, MomentraBase.s300.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                .padding(vertical = 48.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "No group activity yet.\nCreate a group or split an expense to get started.",
                fontSize = 13.sp,
                color = MomentraBase.onDark40,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Footer hint
        Text(
            text = "Invite members and track who owes what. Balances and settlements appear here.",
            fontSize = 11.sp,
            color = MomentraBase.onDark40,
        )
    }
}

@Composable
private fun GroupActionButton(
    label: String,
    icon: String,
    isPrimary: Boolean,
    theme: app.momentra.ui.theme.MomentraContextTheme,
    modifier: Modifier = Modifier,
) {
    val bg = if (isPrimary) {
        Brush.horizontalGradient(listOf(theme.accent, theme.accentEnd))
    } else {
        Brush.horizontalGradient(listOf(theme.accent.copy(alpha = 0.12f), theme.accent.copy(alpha = 0.12f)))
    }
    val textColor = if (isPrimary) Color.White else theme.text

    Button(
        onClick = { /* TODO: navigate */ },
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
    ) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(brush = bg, shape = RoundedCornerShape(12.dp)),
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(text = icon, fontSize = 14.sp)
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.4.sp,
                color = textColor,
            )
        }
    }
}
