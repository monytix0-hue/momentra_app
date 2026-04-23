package app.momentra.ui.mvp

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.ui.theme.DesignTokens

private val Muted = DesignTokens.base.onDark60
private val Footer = DesignTokens.base.onDark40

/** OB-MVP-3 — phone login (parity with iOS `PhoneLoginView`). */
@Composable
fun PhoneLoginScreen(
    nationalNumber: String,
    onNationalNumberChange: (String) -> Unit,
    loading: Boolean,
    onSendOtp: () -> Unit,
    onGoogleSignIn: () -> Unit,
) {
    val brand = DesignTokens.base.brand
    val bg = DesignTokens.base.bg

    Box(Modifier.fillMaxSize().background(bg)) {
        Box(
            Modifier
                .size(340.dp)
                .offset(y = (-220).dp)
                .align(Alignment.TopCenter)
                .clip(CircleShape)
                .background(brand.copy(alpha = 0.15f)),
        )
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.spacing.screenH),
        ) {
            Row(Modifier.fillMaxWidth().padding(top = 48.dp), horizontalArrangement = Arrangement.Center) {
                MomentraWordmark(sizeSp = 20f, dotSizeDp = 5f, dotOffsetXDp = 1f, dotOffsetYDp = -8f)
            }
            Text(
                "Enter your number",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.base.onDark,
                modifier = Modifier.padding(top = 28.dp),
            )
            Column(Modifier.padding(top = 12.dp)) {
                Text("We'll send a one-time code to verify.", fontSize = 14.sp, color = Muted)
                Text("New users are created automatically.", fontSize = 14.sp, color = Muted)
            }
            Text(
                "Mobile number",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = Muted,
                modifier = Modifier.padding(top = 24.dp),
            )
            Row(
                Modifier
                    .padding(top = 4.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(DesignTokens.base.s200)
                    .border(2.dp, brand, RoundedCornerShape(16.dp))
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    Modifier
                        .width(68.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(DesignTokens.base.s200)
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "IN",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Muted,
                    )
                    Text(
                        "+91",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = DesignTokens.base.onDark,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
                Box(
                    Modifier
                        .padding(horizontal = 8.dp)
                        .width(1.dp)
                        .height(40.dp)
                        .background(DesignTokens.base.s200),
                )
                TextField(
                    value = nationalNumber,
                    onValueChange = { onNationalNumberChange(it.filter(Char::isDigit).take(10)) },
                    placeholder = { Text("9876543210", color = Muted) },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        cursorColor = DesignTokens.base.onDark,
                        focusedTextColor = DesignTokens.base.onDark,
                        unfocusedTextColor = DesignTokens.base.onDark,
                    ),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    textStyle = androidx.compose.ui.text.TextStyle(
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Medium,
                        color = DesignTokens.base.onDark,
                    ),
                )
            }
            Button(
                onClick = onSendOtp,
                enabled = nationalNumber.length == 10 && !loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = brand,
                    disabledContainerColor = DesignTokens.base.s300,
                ),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = DesignTokens.base.onDark,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("Send OTP", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = DesignTokens.base.onDark)
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
                        .clip(RoundedCornerShape(999.dp))
                        .background(DesignTokens.base.s200)
                        .padding(horizontal = 12.dp, vertical = 6.dp),
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
            orDivider(Modifier.padding(top = 20.dp))
            socialButton(
                title = "Continue with Google",
                showLetterG = false,
                onClick = onGoogleSignIn,
                icon = {
                    Icon(
                        imageVector = Icons.Default.AccountCircle,
                        contentDescription = null,
                        tint = DesignTokens.base.onDark,
                        modifier = Modifier.size(DesignTokens.icon.md),
                    )
                },
            )
            Text(
                "By continuing you agree to our Terms of Service and Privacy Policy",
                fontSize = 11.sp,
                color = Footer,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 32.dp),
            )
        }
    }
}

@Composable
private fun orDivider(modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f).height(1.dp).background(DesignTokens.base.s300))
        Text("or continue with", fontSize = 12.sp, color = Muted, modifier = Modifier.padding(horizontal = 8.dp))
        Box(Modifier.weight(1f).height(1.dp).background(DesignTokens.base.s300))
    }
}

@Composable
private fun socialButton(
    title: String,
    showLetterG: Boolean,
    onClick: () -> Unit,
    icon: @Composable () -> Unit,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .height(52.dp),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, DesignTokens.base.s300),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = DesignTokens.base.s100),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(DesignTokens.icon.lg), contentAlignment = Alignment.Center) { icon() }
            if (showLetterG) {
                Text("G", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DesignTokens.base.onDark, modifier = Modifier.padding(start = 12.dp))
            }
            Text(
                title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = DesignTokens.base.onDark,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
    }
}
