package app.momentra.ui.mvp

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens

/** Lowercase wordmark — parity with iOS `MomentraWordmark`. */
@Composable
fun MomentraWordmark(
    modifier: Modifier = Modifier,
    sizeSp: Float = 26f,
    dotSizeDp: Float = 7f,
    dotOffsetXDp: Float = 2f,
    dotOffsetYDp: Float = -10f,
) {
    val soft = DesignTokens.base.onDark
    val ember = DesignTokens.splash.ember
    val amber = DesignTokens.splash.amber
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.Start,
    ) {
        Text(
            text = "momentr",
            fontSize = sizeSp.sp,
            fontWeight = FontWeight.Medium,
            color = soft,
            letterSpacing = (-0.5).sp,
        )
        Row(verticalAlignment = Alignment.Top) {
            Text(
                text = "a",
                fontSize = sizeSp.sp,
                fontWeight = FontWeight.Medium,
                color = ember,
                letterSpacing = (-0.5).sp,
            )
            Box(
                Modifier
                    .offset(x = dotOffsetXDp.dp, y = dotOffsetYDp.dp)
                    .size((dotSizeDp * 0.7f).dp)
                    .clip(CircleShape)
                    .background(amber),
            )
        }
    }
}
