package app.momentra.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * OB-MVP-1 — brand splash. Figma 208:2: ~0.8s auto-dismiss, logo + wordmark + tagline + loading ring,
 * radial purple glow (no tap).
 */
@Composable
fun SplashScreen(onFinish: () -> Unit) {
    val brandDeep = DesignTokens.base.brandDeep
    val ember = DesignTokens.splash.ember
    val amber = DesignTokens.splash.amber
    val softWhite = DesignTokens.base.onDark

    val contentAlpha = remember { Animatable(0f) }
    val orb = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        launch { orb.animateTo(1f, tween(280, easing = FastOutSlowInEasing)) }
        launch { contentAlpha.animateTo(1f, tween(320, easing = FastOutSlowInEasing)) }
        delay(800)
        onFinish()
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(brandDeep),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .size(260.dp)
                .offset(x = 110.dp, y = (-190).dp)
                .graphicsLayer { alpha = orb.value * 0.85f }
                .background(ember.copy(alpha = 0.18f), CircleShape),
        )
        Box(
            Modifier
                .size(200.dp)
                .offset(x = (-110).dp, y = 210.dp)
                .graphicsLayer { alpha = orb.value * 0.85f }
                .background(amber.copy(alpha = 0.12f), CircleShape),
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = contentAlpha.value },
        ) {
            Canvas(Modifier.size(120.dp)) {
                val w = size.width
                fun p(v: Float) = v * w / 120f

                drawPath(
                    path = Path().apply {
                        moveTo(p(14f), p(100f))
                        lineTo(p(14f), p(50f))
                        lineTo(p(34f), p(74f))
                        lineTo(p(54f), p(24f))
                        lineTo(p(54f), p(100f))
                    },
                    color = softWhite.copy(alpha = 0.22f),
                    style = Stroke(p(8f), cap = StrokeCap.Round, join = StrokeJoin.Round),
                )

                val pts = listOf(
                    Offset(p(14f), p(100f)),
                    Offset(p(14f), p(62f)),
                    Offset(p(34f), p(74f)),
                    Offset(p(54f), p(32f)),
                    Offset(p(54f), p(100f)),
                )
                pts.forEach { drawCircle(softWhite, p(6f), it) }

                val sparkPts = listOf(
                    Offset(p(54f), p(100f)),
                    Offset(p(54f), p(32f)),
                    Offset(p(74f), p(74f)),
                    Offset(p(94f), p(32f)),
                    Offset(p(96f), p(100f)),
                )
                val total = sparkPts.size - 1
                for (i in 0 until total) {
                    val t = i.toFloat() / total
                    val col = Color(
                        red = ember.red + (amber.red - ember.red) * t,
                        green = ember.green + (amber.green - ember.green) * t,
                        blue = ember.blue + (amber.blue - ember.blue) * t,
                    )
                    drawLine(col, sparkPts[i], sparkPts[i + 1], p(8f), StrokeCap.Round)
                }
                drawCircle(amber, p(10f), Offset(p(105f), p(18f)))
                drawCircle(ember, p(5.5f), Offset(p(105f), p(18f)))
            }

            Spacer(Modifier.height(20.dp))

            Row(verticalAlignment = Alignment.Top) {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(color = softWhite)) { append("momentr") }
                        withStyle(SpanStyle(color = ember)) { append("a") }
                    },
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = (-0.5).sp,
                )
                Spacer(Modifier.width(2.dp))
                Box(
                    Modifier
                        .size(7.dp)
                        .offset(y = (-4).dp)
                        .background(amber, CircleShape),
                )
            }

            Spacer(Modifier.height(5.dp))

            Text(
                text = "TOGETHER · FORWARD",
                fontSize = 9.sp,
                fontWeight = FontWeight.Normal,
                letterSpacing = 3.sp,
                color = softWhite.copy(alpha = 0.38f),
            )

            Spacer(Modifier.height(40.dp))

            CircularProgressIndicator(
                modifier = Modifier.size(28.dp),
                color = amber.copy(alpha = 0.9f),
                strokeWidth = 2.dp,
            )
        }
    }
}
