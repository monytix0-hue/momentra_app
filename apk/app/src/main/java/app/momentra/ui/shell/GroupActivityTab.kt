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
fun GroupActivityTab(
    groupId: String? = null,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Title
        Text(
            text = "Group · Activity",
            style = DesignTokens.type.titleXL,
            color = MomentraBase.onDark,
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "Recent transactions and changes in your groups.",
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
            Text(
                text = "No activity yet.\nGroup expenses, settlements, and member updates will appear here.",
                fontSize = 13.sp,
                color = MomentraBase.onDark40,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }
    }
}
