package app.momentra.ui.mvp

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraPrimaryButton

private val Muted = DesignTokens.base.onDark60
private val Muted2 = DesignTokens.base.onDark40
private val Green = DesignTokens.urgency.cta
private val Red = DesignTokens.urgency.high

/** OB-MVP-2 — single onboarding (parity with iOS `OnboardingMVPView`). */
@Composable
fun OnboardingMVPScreen(
    onGetStarted: () -> Unit,
    onSignIn: () -> Unit,
) {
    val brand = DesignTokens.base.brand
    val ember = DesignTokens.splash.ember
    val bg = DesignTokens.base.bg

    Box(Modifier.fillMaxSize().background(bg)) {
        Box(
            Modifier
                .size(380.dp)
                .offset(x = (-40).dp, y = (-280).dp)
                .align(Alignment.TopStart)
                .clip(CircleShape)
                .background(ember.copy(alpha = 0.12f)),
        )
        Box(
            Modifier
                .size(400.dp)
                .offset(x = 120.dp, y = 320.dp)
                .align(Alignment.BottomEnd)
                .clip(CircleShape)
                .background(brand.copy(alpha = 0.08f)),
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.spacing.screenH),
        ) {
            Row(
                Modifier.padding(top = DesignTokens.spacing.screenV + DesignTokens.spacing.item),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    Modifier
                        .size(44.dp)
                        .background(DesignTokens.base.s200, RoundedCornerShape(DesignTokens.radius.input)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = DesignTokens.base.onDark,
                        modifier = Modifier.size(DesignTokens.icon.md),
                    )
                }
                Column(Modifier.padding(start = DesignTokens.spacing.item, top = 2.dp)) {
                    MomentraWordmark(sizeSp = 18f, dotSizeDp = 5f, dotOffsetXDp = 1f, dotOffsetYDp = -8f)
                }
                Spacer(Modifier.weight(1f))
            }

            previewCard(Modifier.padding(top = DesignTokens.spacing.screenV))

            Column(Modifier.padding(top = DesignTokens.spacing.section + DesignTokens.spacing.item)) {
                Text(
                    text = "Your money,\nall in one place.",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.base.onDark,
                    lineHeight = 42.sp,
                )
                Text(
                    text = "Track expenses, split with friends,\nand manage business budgets.",
                    fontSize = 15.sp,
                    color = Muted,
                    modifier = Modifier.padding(top = DesignTokens.spacing.section),
                )
            }

            Box(
                Modifier
                    .padding(top = DesignTokens.spacing.screenV)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(width = 24.dp, height = DesignTokens.sizing.triggerDot)
                        .clip(RoundedCornerShape(DesignTokens.radius.data))
                        .background(brand),
                )
            }

            MomentraPrimaryButton(
                label = "Get Started",
                onClick = onGetStarted,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = DesignTokens.spacing.section + DesignTokens.spacing.item)
                    .height(52.dp),
            )

            TextButton(
                onClick = onSignIn,
                modifier = Modifier.fillMaxWidth().padding(top = DesignTokens.spacing.cardH),
            ) {
                Text(
                    "Already have an account?  Sign in",
                    fontSize = 13.sp,
                    color = Muted,
                )
            }

            Text(
                text = "No card needed · Free to start",
                fontSize = 11.sp,
                color = Muted2,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        top = DesignTokens.spacing.item,
                        bottom = DesignTokens.spacing.screenV + DesignTokens.spacing.screenV,
                    ),
            )
        }
    }
}

@Composable
private fun previewCard(modifier: Modifier = Modifier) {
    val s100 = DesignTokens.base.s100
    val brand = DesignTokens.base.brand
    Column(modifier) {
        Box(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(DesignTokens.radius.hero))
                .background(s100),
        ) {
            Box(
                Modifier
                    .matchParentSize()
                    .background(brand.copy(alpha = 0.05f)),
            )
            Column(Modifier.padding(DesignTokens.spacing.screenV + DesignTokens.spacing.xs)) {
                Text(
                    DesignTokens.formatInr(124_500.0),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.base.onDark,
                )
                Text(
                    "Net balance · May 2025",
                    fontSize = 11.sp,
                    color = Muted,
                    modifier = Modifier.padding(top = DesignTokens.spacing.item),
                )
                Row(Modifier.padding(top = DesignTokens.spacing.xs)) {
                    pill("Personal", DesignTokens.personal.surface, DesignTokens.personal.text)
                    Spacer(Modifier.size(DesignTokens.spacing.item))
                    pill("Groups", DesignTokens.group.surface, DesignTokens.group.text)
                    Spacer(Modifier.size(DesignTokens.spacing.item))
                    pill("Business", DesignTokens.business.surface, DesignTokens.business.text)
                }
                Column(Modifier.padding(top = DesignTokens.spacing.section)) {
                    txnRow(Icons.Filled.Restaurant, "Dinner — Social Kitchen", "-₹840", false)
                    Spacer(Modifier.height(DesignTokens.spacing.item))
                    txnRow(Icons.Filled.ShoppingCart, "DMart Groceries", "-₹2,100", false)
                    Spacer(Modifier.height(DesignTokens.spacing.item))
                    txnRow(Icons.Filled.AttachMoney, "Salary — May", "+₹85,000", true)
                }
            }
        }
        Box(
            Modifier
                .fillMaxWidth()
                .padding(top = DesignTokens.spacing.section)
                .clip(RoundedCornerShape(DesignTokens.radius.card)),
        ) {
            Box(Modifier.matchParentSize().background(s100))
            Box(Modifier.matchParentSize().background(Green.copy(alpha = 0.06f)))
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(DesignTokens.spacing.cardH),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Goa Trip Fund  ·  4 members  ·  ₹38,500 raised",
                    fontSize = 12.sp,
                    color = Muted,
                    modifier = Modifier.weight(1f),
                )
                Text("77%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Green)
            }
        }
    }
}

@Composable
private fun pill(label: String, bg: Color, fg: Color) {
    Text(
        text = label,
        fontSize = 10.sp,
        fontWeight = FontWeight.SemiBold,
        color = fg,
        modifier = Modifier
            .clip(RoundedCornerShape(DesignTokens.radius.pill))
            .background(bg)
            .padding(horizontal = DesignTokens.spacing.section, vertical = 5.dp),
    )
}

@Composable
private fun txnRow(icon: ImageVector, title: String, amount: String, positive: Boolean) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(DesignTokens.radius.contextTabInner))
            .background(DesignTokens.base.s200)
            .padding(
                horizontal = DesignTokens.spacing.section,
                vertical = DesignTokens.spacing.section,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(DesignTokens.icon.lg),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (positive) Green else Muted,
                modifier = Modifier.size(DesignTokens.icon.sm),
            )
        }
        Text(
            title,
            fontSize = 11.sp,
            color = Muted,
            modifier = Modifier.padding(start = DesignTokens.spacing.section).weight(1f),
        )
        Text(
            amount,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = if (positive) Green else Red,
        )
    }
}
