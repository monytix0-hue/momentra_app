package app.momentra.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.network.BusinessBudgetCreateIn
import app.momentra.ui.theme.DesignTokens

data class BusinessCreateMomentFormState(
    val budgetName: String = "",
    val budgetType: String = "operations",
    val totalBudgetInput: String = "",
    val budgetPeriod: String = "Monthly",
    val department: String = "Operations",
    val approvalThresholdInput: String = "",
    val error: String? = null,
)

private fun defaultBusinessCreateForm(preset: BusinessQuickTemplate?): BusinessCreateMomentFormState {
    if (preset == null) return BusinessCreateMomentFormState()
    return BusinessCreateMomentFormState(
        budgetName = preset.budgetName,
        budgetType = preset.budgetType,
        totalBudgetInput = preset.totalBudget?.toString().orEmpty(),
        budgetPeriod = preset.budgetPeriod,
        department = preset.department,
        approvalThresholdInput = preset.approvalThreshold?.toString().orEmpty(),
    )
}

private fun BusinessCreateMomentFormState.toCreateIn(): BusinessBudgetCreateIn {
    return BusinessBudgetCreateIn(
        budgetName = budgetName.trim(),
        budgetType = budgetType.trim().ifBlank { "operations" },
        totalBudget = totalBudgetInput.trim().toDoubleOrNull(),
        budgetPeriod = budgetPeriod.trim().ifBlank { "Monthly" },
        department = department.trim().ifBlank { "Operations" },
        approvalThreshold = approvalThresholdInput.trim().toDoubleOrNull(),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessCreateMomentSheet(
    contextAccent: Color,
    accentEnd: Color,
    preset: BusinessQuickTemplate?,
    sheetKey: Int,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (BusinessBudgetCreateIn) -> Unit,
) {
    var form by remember(sheetKey) { mutableStateOf(defaultBusinessCreateForm(preset)) }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.imePadding(),
        containerColor = DesignTokens.base.s100,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            Text(
                "New business moment",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.budgetName,
                onValueChange = { form = form.copy(budgetName = it, error = null) },
                label = { Text("Business moment name") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.budgetType,
                onValueChange = { form = form.copy(budgetType = it, error = null) },
                label = { Text("Type (operations/procurement/sales)") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.totalBudgetInput,
                onValueChange = {
                    form = form.copy(
                        totalBudgetInput = it.filter { ch -> ch.isDigit() || ch == '.' },
                        error = null,
                    )
                },
                label = { Text("Total budget (optional)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.budgetPeriod,
                onValueChange = { form = form.copy(budgetPeriod = it, error = null) },
                label = { Text("Budget period") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.department,
                onValueChange = { form = form.copy(department = it, error = null) },
                label = { Text("Department") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.approvalThresholdInput,
                onValueChange = {
                    form = form.copy(
                        approvalThresholdInput = it.filter { ch -> ch.isDigit() || ch == '.' },
                        error = null,
                    )
                },
                label = { Text("Approval threshold (optional)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )

            form.error?.let {
                Text(
                    text = it,
                    color = DesignTokens.urgency.high,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Box(
                modifier = Modifier
                    .padding(top = 14.dp, bottom = 18.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.horizontalGradient(listOf(contextAccent, accentEnd)))
                    .clickable(
                        enabled = !isSubmitting,
                        onClick = {
                            if (form.budgetName.trim().isEmpty()) {
                                form = form.copy(error = "Enter a business moment name")
                                return@clickable
                            }
                            if (form.totalBudgetInput.isNotBlank() && form.totalBudgetInput.toDoubleOrNull() == null) {
                                form = form.copy(error = "Total budget must be a valid number")
                                return@clickable
                            }
                            if (form.approvalThresholdInput.isNotBlank() && form.approvalThresholdInput.toDoubleOrNull() == null) {
                                form = form.copy(error = "Approval threshold must be a valid number")
                                return@clickable
                            }
                            onSubmit(form.toCreateIn())
                        },
                    )
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = DesignTokens.semantic.ctaText,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("Create business moment", color = DesignTokens.semantic.ctaText, style = DesignTokens.type.label)
                }
            }
        }
    }
}
