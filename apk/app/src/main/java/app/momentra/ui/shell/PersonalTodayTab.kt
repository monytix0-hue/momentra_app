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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.data.AuthRepository
import app.momentra.network.PersonalTransactionCreateIn
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.LocalMomentraTheme
import app.momentra.ui.theme.MomentraBase
import app.momentra.ui.theme.MomentraContext
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

private fun inr(amount: Double): String {
    val nf = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    nf.maximumFractionDigits = 0
    return nf.format(amount)
}

@Composable
fun PersonalTodayTab(
    authRepository: AuthRepository,
) {
    val scope = rememberCoroutineScope()
    val theme = LocalMomentraTheme.current.contextTheme

    var quickAmount by remember { mutableStateOf("") }
    var quickMerchant by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf<String?>(null) }

    // Dismiss feedback after 4 seconds
    LaunchedEffect(feedback) {
        if (feedback != null) {
            kotlinx.coroutines.delay(4000)
            feedback = null
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        // Title
        Text(
            text = "Personal · Today",
            style = DesignTokens.type.titleXL,
            color = MomentraBase.onDark,
        )

        Spacer(modifier = Modifier.height(16.dp))

        // KPI Row — 3 cells
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            KpiCell(title = "Spend", value = "₹0")
            KpiCell(title = "Income", value = "₹0")
            KpiCell(title = "Net", value = "₹0", accentColor = DesignTokens.urgency.cta)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Action Row — 2 buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ActionButton(
                label = "New moment",
                icon = "🎯",
                isPrimary = true,
                theme = theme,
                modifier = Modifier.weight(1f),
            )
            ActionButton(
                label = "Add txn",
                icon = "+",
                isPrimary = false,
                theme = theme,
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Quick Add Form
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MomentraBase.s100)
                .border(0.5.dp, MomentraBase.s300.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                .padding(16.dp),
        ) {
            Column {
                Text(
                    text = "QUICK ADD",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.8.sp,
                    color = MomentraBase.onDark.copy(alpha = 0.35f),
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = quickAmount,
                        onValueChange = { quickAmount = it },
                        placeholder = { Text("Amount", fontSize = 13.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = theme.accent,
                            unfocusedBorderColor = MomentraBase.s300,
                            cursorColor = theme.accent,
                            focusedContainerColor = MomentraBase.s200,
                            unfocusedContainerColor = MomentraBase.s200,
                        ),
                    )

                    OutlinedTextField(
                        value = quickMerchant,
                        onValueChange = { quickMerchant = it },
                        placeholder = { Text("What for?", fontSize = 13.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1.5f),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = theme.accent,
                            unfocusedBorderColor = MomentraBase.s300,
                            cursorColor = theme.accent,
                            focusedContainerColor = MomentraBase.s200,
                            unfocusedContainerColor = MomentraBase.s200,
                        ),
                    )

                    Button(
                        onClick = {
                            val amt = quickAmount.toDoubleOrNull() ?: return@Button
                            if (amt <= 0) return@Button
                            scope.launch {
                                busy = true
                                try {
                                    val token = authRepository.getIdToken() ?: return@launch
                                    val txn = PersonalTransactionCreateIn(
                                        isIncome = false,
                                        amount = amt,
                                        category = if (quickMerchant.isNotBlank()) quickMerchant else "other",
                                        title = quickMerchant.ifBlank { null },
                                    )
                                    authRepository.createPersonalTransaction(txn)
                                    quickAmount = ""
                                    quickMerchant = ""
                                    feedback = "Logged ${inr(amt)}"
                                } catch (_: Exception) {
                                    feedback = "Could not save"
                                } finally {
                                    busy = false
                                }
                            }
                        },
                        enabled = quickAmount.isNotBlank() && !busy,
                        modifier = Modifier.weight(0.8f),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.Transparent,
                            disabledContainerColor = Color.Transparent,
                        ),
                    ) {
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .background(
                                    brush = Brush.horizontalGradient(listOf(theme.accent, theme.accentEnd)),
                                    shape = RoundedCornerShape(14.dp),
                                ),
                        )
                        Text(
                            text = if (busy) "…" else "Log",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.2.sp,
                            color = Color.White,
                        )
                    }
                }

                if (feedback != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = feedback!!,
                        fontSize = 13.sp,
                        color = theme.text,
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Today's Ledger section
        Text(
            text = "Today's ledger",
            style = DesignTokens.type.bodyMedium,
            color = MomentraBase.onDark,
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Empty state
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(MomentraBase.s200.copy(alpha = 0.5f))
                .border(1.dp, MomentraBase.s300.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                .padding(vertical = 40.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "No transactions dated today.\nUse the form above to log income or expense.",
                fontSize = 13.sp,
                color = MomentraBase.onDark40,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Footer hint
        Text(
            text = "Goals and moments live on Plan. Use + Add for income or expenses.",
            fontSize = 11.sp,
            color = MomentraBase.onDark40,
        )
    }
}

@Composable
private fun KpiCell(
    title: String,
    value: String,
    accentColor: Color = MomentraBase.onDark,
) {
    Box(
        modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(12.dp))
            .background(MomentraBase.s200.copy(alpha = 0.4f))
            .border(0.5.dp, MomentraBase.s300.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Column {
            Text(
                text = title.uppercase(),
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.6.sp,
                color = MomentraBase.onDark.copy(alpha = 0.35f),
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = accentColor,
            )
        }
    }
}

@Composable
private fun ActionButton(
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
