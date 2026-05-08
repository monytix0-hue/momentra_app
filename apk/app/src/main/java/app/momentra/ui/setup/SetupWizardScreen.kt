package app.momentra.ui.setup

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.unit.dp
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraGhostButton
import app.momentra.ui.theme.MomentraPrimaryButton
import app.momentra.ui.theme.MomentraScreenChrome
import app.momentra.ui.theme.rememberMomentraThemeState

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
    val themeState = rememberMomentraThemeState(selectedContext)
    val theme = themeState.contextTheme
    val ctaStyle = themeState.actionStyle()

    MomentraScreenChrome(
        context = selectedContext,
        modifier = Modifier.fillMaxSize(),
        headerHeight = 132.dp,
        orbSize = 340.dp,
        orbOffsetY = (-110).dp,
        orbExtraOpacity = 0f,
    ) { _ ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.spacing.screenH, vertical = DesignTokens.spacing.screenV),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.spacing.cardH),
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
                                width = 0.5.dp,
                                color = if (isSelected) itemTheme.accent else DesignTokens.base.s300,
                                shape = RoundedCornerShape(DesignTokens.radius.input),
                            )
                            .clickable { focus = key }
                            .padding(
                                horizontal = DesignTokens.spacing.cardH,
                                vertical = DesignTokens.spacing.section,
                            ),
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
            Spacer(modifier = Modifier.height(DesignTokens.spacing.inline))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (step == 2) {
                    MomentraGhostButton(
                        label = "Back",
                        onClick = { step = 1 },
                        borderColor = DesignTokens.base.s300,
                        contentColor = DesignTokens.base.onDark,
                    )
                } else {
                    Spacer(modifier = Modifier.height(1.dp))
                }

                MomentraPrimaryButton(
                    label = if (step == 1) "Next" else "Finish",
                    actionStyle = ctaStyle,
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
                )
            }
        }
    }
}
