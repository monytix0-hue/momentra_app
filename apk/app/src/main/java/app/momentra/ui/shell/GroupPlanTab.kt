package app.momentra.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraBase

@Composable
fun GroupPlanTab(
    groupId: String? = null,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Title
        Text(
            text = "Group · Plan",
            style = DesignTokens.type.titleXL,
            color = MomentraBase.onDark,
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "Set goals, budgets, and saving plans together.",
            style = DesignTokens.type.caption,
            color = MomentraBase.onDark60,
        )

        Spacer(modifier = Modifier.height(32.dp))

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
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 24.dp),
            ) {
                Text(
                    text = "No plans yet",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MomentraBase.onDark,
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Create a group goal or budget to track\nsavings and spending together.",
                    fontSize = 13.sp,
                    color = MomentraBase.onDark40,
                    textAlign = TextAlign.Center,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Hint
        Text(
            text = "Plans let your group align on shared financial goals. Start with a trip fund, rent pool, or event budget.",
            fontSize = 11.sp,
            color = MomentraBase.onDark40,
        )
    }
}
