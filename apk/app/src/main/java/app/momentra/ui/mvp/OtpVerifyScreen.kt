package app.momentra.ui.mvp

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraPrimaryButton
import kotlinx.coroutines.delay

private val Muted = DesignTokens.base.onDark60
private val Green = DesignTokens.urgency.cta

/** OB-MVP-4 — OTP verify (Figma 208:2: six boxes, resend timer, Firebase badge, primary CTA). */
@Composable
fun OtpVerifyScreen(
    phoneDisplay: String,
    otp: String,
    onOtpChange: (String) -> Unit,
    loading: Boolean,
    resendLoading: Boolean,
    onVerify: () -> Unit,
    onBack: () -> Unit,
    onChangeNumber: () -> Unit,
    onResend: () -> Unit,
    resendCooldownReset: Int,
) {
    val brand = DesignTokens.base.brand
    val bg = DesignTokens.base.bg
    val focusRequester = remember { FocusRequester() }
    var resendSecondsLeft by remember { mutableIntStateOf(60) }

    LaunchedEffect(resendCooldownReset) {
        resendSecondsLeft = 60
        while (resendSecondsLeft > 0) {
            delay(1000)
            resendSecondsLeft--
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(Modifier.fillMaxSize().background(bg)) {
        Box(
            Modifier
                .size(320.dp)
                .align(Alignment.TopCenter)
                .padding(top = 40.dp)
                .clip(CircleShape)
                .background(brand.copy(alpha = 0.12f)),
        )
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.spacing.screenH),
        ) {
            TextButton(onClick = onBack, modifier = Modifier.padding(start = 4.dp, top = 12.dp)) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = DesignTokens.base.onDark,
                    modifier = Modifier.size(DesignTokens.icon.sm),
                )
            }
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.Center) {
                MomentraWordmark(sizeSp = 20f, dotSizeDp = 5f, dotOffsetXDp = 1f, dotOffsetYDp = -8f)
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Lock,
                    contentDescription = null,
                    tint = DesignTokens.base.onDark,
                    modifier = Modifier.size(DesignTokens.icon.lg),
                )
            }
            Text(
                "Verify your number",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.base.onDark,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                textAlign = TextAlign.Center,
            )
            Row(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(phoneDisplay, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Muted)
                TextButton(onClick = onChangeNumber) {
                    Text("Change number", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = DesignTokens.base.brandText)
                }
            }

            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp)
                    .clickable { focusRequester.requestFocus() },
                contentAlignment = Alignment.Center,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.spacing.item)) {
                    repeat(6) { index ->
                        val char = otp.getOrNull(index)?.toString() ?: ""
                        val active = otp.length == index
                        val filled = char.isNotEmpty()
                        val boxShape = RoundedCornerShape(DesignTokens.radius.input)
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(boxShape)
                                .background(DesignTokens.base.s200)
                                .then(
                                    when {
                                        filled -> Modifier.border(1.5.dp, brand, boxShape)
                                        active -> Modifier.border(1.5.dp, brand.copy(alpha = 0.85f), boxShape)
                                        else -> Modifier.border(0.5.dp, DesignTokens.base.s300, boxShape)
                                    },
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = char,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.base.onDark,
                            )
                        }
                    }
                }
                BasicTextField(
                    value = otp,
                    onValueChange = { onOtpChange(it.filter(Char::isDigit).take(6)) },
                    modifier = Modifier
                        .size(1.dp)
                        .focusRequester(focusRequester),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true,
                    cursorBrush = SolidColor(Color.Transparent),
                    textStyle = androidx.compose.ui.text.TextStyle(color = Color.Transparent, fontSize = 1.sp),
                )
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (resendSecondsLeft > 0) {
                    Text(
                        "Resend code in ${resendSecondsLeft}s",
                        fontSize = 13.sp,
                        color = Muted,
                    )
                } else {
                    TextButton(
                        onClick = onResend,
                        enabled = !resendLoading && !loading,
                    ) {
                        if (resendLoading) {
                            CircularProgressIndicator(Modifier.size(18.dp), color = brand, strokeWidth = 2.dp)
                        } else {
                            Text("Resend OTP", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = DesignTokens.base.brandText)
                        }
                    }
                }
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                Row(
                    Modifier
                        .clip(RoundedCornerShape(DesignTokens.radius.pill))
                        .background(DesignTokens.base.s200)
                        .padding(
                            horizontal = DesignTokens.spacing.section,
                            vertical = DesignTokens.spacing.inline,
                        ),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Lock,
                        contentDescription = null,
                        tint = Muted,
                        modifier = Modifier.size(DesignTokens.icon.xs),
                    )
                    Text(
                        " Secured by Firebase Authentication",
                        fontSize = 11.sp,
                        color = Muted,
                    )
                }
            }

            MomentraPrimaryButton(
                label = "Verify & Enter App",
                onClick = onVerify,
                enabled = otp.length == 6 && !loading,
                loading = loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = DesignTokens.spacing.section + DesignTokens.spacing.item)
                    .height(52.dp),
            )

            Text(
                "No setup after this — goes straight to your Personal Home.",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Green.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp, bottom = 32.dp),
            )
        }
    }
}
