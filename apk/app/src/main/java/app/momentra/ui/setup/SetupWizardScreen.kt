package app.momentra.ui.setup

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraBase
import app.momentra.ui.theme.MomentraContext

@Composable
fun SetupWizardScreen(
    onFinish: (primaryFocus: String, currency: String?, organizationName: String?) -> Unit,
) {
    var step by remember { mutableStateOf(1) }
    var focus by remember { mutableStateOf<String?>(null) }
    var currency by remember { mutableStateOf("INR") }
    var org by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val selectedContext = when (focus) {
        "group" -> MomentraContext.Group
        "business" -> MomentraContext.Business
        else -> MomentraContext.Personal
    }
    val theme = DesignTokens.theme(forContext = selectedContext)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MomentraBase.bg),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(132.dp)
                .background(theme.headerBrush),
        )
        Box(
            modifier = Modifier
                .size(340.dp)
                .align(Alignment.TopCenter)
                .offset(y = (-110).dp)
                .clip(CircleShape)
                .background(theme.accent.copy(alpha = theme.orbOpacity)),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.spacing.screenH, vertical = DesignTokens.spacing.screenV),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Setup", style = DesignTokens.type.display, color = DesignTokens.base.onDark)

            if (step == 1) {
                Text("What is your primary focus?", style = DesignTokens.type.titleMD, color = DesignTokens.base.onDark)
                listOf(
                    "personal" to "I track money for myself",
                    "group" to "I track expenses with friends/partners",
                    "business" to "I track money for my job/company",
                ).forEach { (key, label) ->
                    val itemContext = when (key) {
                        "group" -> MomentraContext.Group
                        "business" -> MomentraContext.Business
                        else -> MomentraContext.Personal
                    }
                    val itemTheme = DesignTokens.theme(forContext = itemContext)
                    val isSelected = focus == key
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(DesignTokens.radius.input))
                            .background(if (isSelected) itemTheme.surface else DesignTokens.base.s100)
                            .border(
                                width = 1.dp,
                                color = if (isSelected) itemTheme.accent else DesignTokens.base.s300,
                                shape = RoundedCornerShape(DesignTokens.radius.input),
                            )
                            .clickable { focus = key }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                    ) {
                        Text(
                            text = label,
                            style = DesignTokens.type.bodyMedium,
                            color = if (isSelected) itemTheme.text else DesignTokens.base.onDark60,
                        )
                    }
                }
            } else {
                Text("Optional defaults", style = DesignTokens.type.titleMD, color = DesignTokens.base.onDark)
                OutlinedTextField(
                    value = currency,
                    onValueChange = { currency = it.uppercase().take(5) },
                    label = { Text("Default currency", color = DesignTokens.base.onDark60) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = theme.accent,
                        unfocusedBorderColor = DesignTokens.base.s300,
                        focusedLabelColor = theme.text,
                        unfocusedLabelColor = DesignTokens.base.onDark60,
                        focusedTextColor = DesignTokens.base.onDark,
                        unfocusedTextColor = DesignTokens.base.onDark,
                        focusedContainerColor = DesignTokens.base.s100,
                        unfocusedContainerColor = DesignTokens.base.s100,
                        cursorColor = theme.accent,
                    ),
                )
                if (focus == "business") {
                    OutlinedTextField(
                        value = org,
                        onValueChange = { org = it },
                        label = { Text("Organization / Company name", color = DesignTokens.base.onDark60) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = theme.accent,
                            unfocusedBorderColor = DesignTokens.base.s300,
                            focusedLabelColor = theme.text,
                            unfocusedLabelColor = DesignTokens.base.onDark60,
                            focusedTextColor = DesignTokens.base.onDark,
                            unfocusedTextColor = DesignTokens.base.onDark,
                            focusedContainerColor = DesignTokens.base.s100,
                            unfocusedContainerColor = DesignTokens.base.s100,
                            cursorColor = theme.accent,
                        ),
                    )
                }
            }

            error?.let { Text(it, color = DesignTokens.urgency.high, style = DesignTokens.type.caption) }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (step == 2) {
                    Button(
                        onClick = { step = 1 },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = DesignTokens.base.s200,
                            contentColor = DesignTokens.base.onDark,
                        ),
                        shape = RoundedCornerShape(DesignTokens.radius.pill),
                    ) {
                        Text("Back", style = DesignTokens.type.bodyMedium)
                    }
                } else {
                    Spacer(modifier = Modifier.height(1.dp))
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(DesignTokens.radius.button))
                        .background(Brush.horizontalGradient(listOf(theme.accent, theme.accentEnd)))
                        .border(
                            width = 1.dp,
                            color = theme.accent.copy(alpha = 0.35f),
                            shape = RoundedCornerShape(DesignTokens.radius.button),
                        ),
                ) {
                    Button(
                        onClick = {
                            error = null
                            if (step == 1) {
                                if (focus == null) {
                                    error = "Please choose your primary focus."
                                } else {
                                    step = 2
                                }
                            } else {
                                val f = focus
                                if (f == null) {
                                    error = "Please choose your primary focus."
                                    step = 1
                                } else if (f == "business" && org.trim().isEmpty()) {
                                    error = "Organization name is required for business."
                                } else {
                                    onFinish(
                                        f,
                                        currency.trim().ifEmpty { "INR" },
                                        org.trim().ifEmpty { null },
                                    )
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.Transparent,
                            contentColor = DesignTokens.semantic.ctaText,
                        ),
                        shape = RoundedCornerShape(DesignTokens.radius.button),
                    ) {
                        Text(if (step == 1) "Next" else "Finish", style = DesignTokens.type.bodyMedium)
                    }
                }
            }
        }
    }
}
