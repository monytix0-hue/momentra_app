package app.momentra.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraSemantic

@Composable
fun FloatingAddButton(
    context: MomentraContext,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val theme = DesignTokens.theme(forContext = context)
    val gradient = Brush.horizontalGradient(listOf(theme.accent, theme.accentEnd))

    TextButton(
        onClick = onTap,
        modifier = modifier
            .clip(RoundedCornerShape(100.dp))
            .background(gradient),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
        ) {
            Text(
                text = "+",
                fontSize = 18.sp,
                fontWeight = FontWeight.Light,
                color = MomentraSemantic.ctaText,
            )
            Text(
                text = "Add",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = MomentraSemantic.ctaText,
            )
        }
    }
}
