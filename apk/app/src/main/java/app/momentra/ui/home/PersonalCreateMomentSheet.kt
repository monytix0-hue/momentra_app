package app.momentra.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.network.PersonalMomentCreateIn
import app.momentra.ui.theme.DesignTokens

data class PersonalCreateMomentFormState(
    val title: String = "",
    val momentType: String = "goal",
    val rhythmMonthly: Boolean = true,
    val startDateIso: String = calendarDateIso(),
    val endDateIso: String = calendarDateIsoPlusYears(1),
    val targetAmount: String = "",
    val description: String = "",
    val isPrivateMoment: Boolean = true,
    val error: String? = null,
)

private fun defaultCreateForm(preset: PersonalQuickTemplate?): PersonalCreateMomentFormState {
    val today = calendarDateIso()
    val yearOut = calendarDateIsoPlusYears(1)
    if (preset == null) {
        return PersonalCreateMomentFormState(
            startDateIso = today,
            endDateIso = yearOut,
        )
    }
    val monthly = preset.durationType == PersonalMomentDuration.RECURRING_MONTHLY
    val end = preset.endDateIso ?: yearOut
    return PersonalCreateMomentFormState(
        title = preset.title,
        momentType = preset.momentType,
        rhythmMonthly = monthly,
        startDateIso = preset.startDateIso ?: today,
        endDateIso = end,
        targetAmount = preset.targetAmount?.toString() ?: "",
        description = preset.description ?: "",
    )
}

private fun PersonalCreateMomentFormState.toCreateIn(): PersonalMomentCreateIn {
    val duration =
        if (rhythmMonthly) PersonalMomentDuration.RECURRING_MONTHLY else PersonalMomentDuration.FIXED_END
    val target = targetAmount.trim().toDoubleOrNull()
    return PersonalMomentCreateIn(
        title = title.trim(),
        momentType = momentType,
        durationType = duration,
        targetAmount = target,
        startDate = startDateIso.trim().ifBlank { null },
        endDate = if (rhythmMonthly) null else endDateIso.trim().ifBlank { null },
        savingMode = if (rhythmMonthly) "monthly" else null,
        description = description.trim().ifBlank { null },
        isPrivateMoment = isPrivateMoment,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonalCreateMomentSheet(
    contextAccent: Color,
    accentEnd: Color,
    preset: PersonalQuickTemplate?,
    sheetKey: Int,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (PersonalMomentCreateIn) -> Unit,
) {
    var form by remember(sheetKey) { mutableStateOf(defaultCreateForm(preset)) }
    var endPickerOpen by remember(sheetKey) { mutableStateOf(false) }
    var startPickerOpen by remember(sheetKey) { mutableStateOf(false) }

    val endMillis = remember(form.endDateIso) {
        parseIsoToMillis(form.endDateIso) ?: System.currentTimeMillis()
    }
    val startMillis = remember(form.startDateIso) {
        parseIsoToMillis(form.startDateIso) ?: System.currentTimeMillis()
    }
    val endDateState = rememberDatePickerState(initialSelectedDateMillis = endMillis)
    val startDateState = rememberDatePickerState(initialSelectedDateMillis = startMillis)

    if (endPickerOpen) {
        DatePickerDialog(
            onDismissRequest = { endPickerOpen = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        endDateState.selectedDateMillis?.let {
                            form = form.copy(endDateIso = millisToIsoDateUtc(it))
                        }
                        endPickerOpen = false
                    },
                ) { Text("OK", color = contextAccent) }
            },
            dismissButton = {
                TextButton(onClick = { endPickerOpen = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
        ) {
            DatePicker(state = endDateState)
        }
    }

    if (startPickerOpen) {
        DatePickerDialog(
            onDismissRequest = { startPickerOpen = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        startDateState.selectedDateMillis?.let {
                            form = form.copy(startDateIso = millisToIsoDateUtc(it))
                        }
                        startPickerOpen = false
                    },
                ) { Text("OK", color = contextAccent) }
            },
            dismissButton = {
                TextButton(onClick = { startPickerOpen = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
        ) {
            DatePicker(state = startDateState)
        }
    }

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
                "New personal moment",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = form.title,
                onValueChange = { form = form.copy(title = it, error = null) },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(12.dp))

            Text("Rhythm", color = DesignTokens.base.onDark60, style = DesignTokens.type.caption)
            Spacer(Modifier.height(6.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = form.rhythmMonthly,
                    onClick = {
                        form = form.copy(rhythmMonthly = true, error = null)
                    },
                    shape = SegmentedButtonDefaults.itemShape(0, 2),
                ) {
                    Text("Monthly")
                }
                SegmentedButton(
                    selected = !form.rhythmMonthly,
                    onClick = {
                        form = form.copy(rhythmMonthly = false, error = null)
                    },
                    shape = SegmentedButtonDefaults.itemShape(1, 2),
                ) {
                    Text("Ends on date")
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Start date", color = DesignTokens.base.onDark60, fontSize = 12.sp)
                    Text(form.startDateIso, color = DesignTokens.base.onDark, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
                TextButton(onClick = { startPickerOpen = true }) {
                    Text("Change", color = contextAccent)
                }
            }

            if (!form.rhythmMonthly) {
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("End date", color = DesignTokens.base.onDark60, fontSize = 12.sp)
                        Text(form.endDateIso, color = DesignTokens.base.onDark, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                    TextButton(onClick = { endPickerOpen = true }) {
                        Text("Change", color = contextAccent)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.targetAmount,
                onValueChange = {
                    form = form.copy(targetAmount = it.filter { ch -> ch.isDigit() || ch == '.' }, error = null)
                },
                label = { Text("Target amount (optional)") },
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
                value = form.description,
                onValueChange = { form = form.copy(description = it, error = null) },
                label = { Text("Description (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Private moment", color = DesignTokens.base.onDark, fontSize = 14.sp)
                Switch(
                    checked = form.isPrivateMoment,
                    onCheckedChange = { form = form.copy(isPrivateMoment = it) },
                )
            }

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
                            val t = form.title.trim()
                            if (t.isEmpty()) {
                                form = form.copy(error = "Enter a title")
                                return@clickable
                            }
                            if (!form.rhythmMonthly && form.endDateIso.isBlank()) {
                                form = form.copy(error = "Pick an end date")
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
                    Text("Create moment", color = DesignTokens.semantic.ctaText, style = DesignTokens.type.label)
                }
            }
        }
    }
}

private fun parseIsoToMillis(iso: String): Long? {
    return try {
        val p = iso.trim().split("-")
        if (p.size != 3) {
            null
        } else {
            val c = java.util.Calendar.getInstance()
            c.set(p[0].toInt(), p[1].toInt() - 1, p[2].toInt(), 0, 0, 0)
            c.set(java.util.Calendar.MILLISECOND, 0)
            c.timeInMillis
        }
    } catch (_: Exception) {
        null
    }
}
