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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.network.GroupMomentCreateIn
import app.momentra.network.GroupMomentRulesIn
import app.momentra.network.GroupSplitMode
import app.momentra.ui.theme.DesignTokens

data class GroupCreateMomentFormState(
    val title: String = "",
    val momentType: String = "trip_fund",
    val splitMode: String = GroupSplitMode.EQUAL,
    val targetAmount: String = "",
    val destination: String = "",
    val tripStartIso: String = "",
    val tripEndIso: String = "",
    val contributionDueIso: String = "",
    val error: String? = null,
)

private fun defaultGroupCreateForm(preset: GroupQuickTemplate?): GroupCreateMomentFormState {
    val today = calendarDateIso()
    val nextYear = calendarDateIsoPlusYears(1)
    if (preset == null) {
        return GroupCreateMomentFormState(
            tripStartIso = today,
            tripEndIso = nextYear,
        )
    }
    return GroupCreateMomentFormState(
        title = preset.title,
        momentType = preset.momentType,
        splitMode = preset.splitMode,
        targetAmount = preset.targetAmount?.toString().orEmpty(),
        destination = preset.destination.orEmpty(),
        tripStartIso = preset.tripStartDateIso ?: today,
        tripEndIso = preset.tripEndDateIso ?: nextYear,
    )
}

private fun GroupCreateMomentFormState.toCreateIn(): GroupMomentCreateIn {
    val target = targetAmount.trim().toDoubleOrNull()
    return GroupMomentCreateIn(
        title = title.trim(),
        momentType = momentType.trim().ifBlank { "trip_fund" },
        targetAmount = target,
        destination = destination.trim().ifBlank { null },
        tripStartDate = tripStartIso.trim().ifBlank { null },
        tripEndDate = tripEndIso.trim().ifBlank { null },
        splitMode = splitMode,
        contributionDueDate = contributionDueIso.trim().ifBlank { null },
        members = emptyList(),
        rules = GroupMomentRulesIn(),
    )
}

private val splitModeOptions: List<Pair<String, String>> = listOf(
    GroupSplitMode.EQUAL to "Equal",
    GroupSplitMode.EXACT to "Exact",
    GroupSplitMode.PERCENT to "%",
    GroupSplitMode.SHARES to "Shares",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupCreateMomentSheet(
    contextAccent: Color,
    accentEnd: Color,
    preset: GroupQuickTemplate?,
    sheetKey: Int,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (GroupMomentCreateIn) -> Unit,
) {
    var form by remember(sheetKey) { mutableStateOf(defaultGroupCreateForm(preset)) }
    var tripStartPickerOpen by remember(sheetKey) { mutableStateOf(false) }
    var tripEndPickerOpen by remember(sheetKey) { mutableStateOf(false) }
    var contributionPickerOpen by remember(sheetKey) { mutableStateOf(false) }

    val tripStartMillis = remember(form.tripStartIso) {
        parseIsoToMillisGroup(form.tripStartIso) ?: System.currentTimeMillis()
    }
    val tripEndMillis = remember(form.tripEndIso) {
        parseIsoToMillisGroup(form.tripEndIso) ?: System.currentTimeMillis()
    }
    val contribMillis = remember(form.contributionDueIso) {
        parseIsoToMillisGroup(form.contributionDueIso) ?: System.currentTimeMillis()
    }
    val tripStartState = rememberDatePickerState(initialSelectedDateMillis = tripStartMillis)
    val tripEndState = rememberDatePickerState(initialSelectedDateMillis = tripEndMillis)
    val contribState = rememberDatePickerState(initialSelectedDateMillis = contribMillis)

    if (tripStartPickerOpen) {
        DatePickerDialog(
            onDismissRequest = { tripStartPickerOpen = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        tripStartState.selectedDateMillis?.let {
                            form = form.copy(tripStartIso = millisToIsoDateUtc(it))
                        }
                        tripStartPickerOpen = false
                    },
                ) { Text("OK", color = contextAccent) }
            },
            dismissButton = {
                TextButton(onClick = { tripStartPickerOpen = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
        ) {
            DatePicker(state = tripStartState)
        }
    }

    if (tripEndPickerOpen) {
        DatePickerDialog(
            onDismissRequest = { tripEndPickerOpen = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        tripEndState.selectedDateMillis?.let {
                            form = form.copy(tripEndIso = millisToIsoDateUtc(it))
                        }
                        tripEndPickerOpen = false
                    },
                ) { Text("OK", color = contextAccent) }
            },
            dismissButton = {
                TextButton(onClick = { tripEndPickerOpen = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
        ) {
            DatePicker(state = tripEndState)
        }
    }

    if (contributionPickerOpen) {
        DatePickerDialog(
            onDismissRequest = { contributionPickerOpen = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        contribState.selectedDateMillis?.let {
                            form = form.copy(contributionDueIso = millisToIsoDateUtc(it))
                        }
                        contributionPickerOpen = false
                    },
                ) { Text("OK", color = contextAccent) }
            },
            dismissButton = {
                TextButton(onClick = { contributionPickerOpen = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
        ) {
            DatePicker(state = contribState)
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
                "New group moment",
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

            Text("Default split (Splitwise-style)", color = DesignTokens.base.onDark60, style = DesignTokens.type.caption)
            Spacer(Modifier.height(6.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                splitModeOptions.forEachIndexed { index, (mode, label) ->
                    SegmentedButton(
                        selected = form.splitMode == mode,
                        onClick = { form = form.copy(splitMode = mode, error = null) },
                        shape = SegmentedButtonDefaults.itemShape(index, splitModeOptions.size),
                    ) {
                        Text(label, fontSize = 11.sp, maxLines = 1)
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
                value = form.destination,
                onValueChange = { form = form.copy(destination = it, error = null) },
                label = { Text("Destination / label (optional)") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = contextAccent,
                    focusedLabelColor = contextAccent,
                    cursorColor = contextAccent,
                ),
            )

            Spacer(Modifier.height(12.dp))
            Text("Trip dates (optional)", color = DesignTokens.base.onDark60, fontSize = 12.sp)
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Start", color = DesignTokens.base.onDark60, fontSize = 12.sp)
                    Text(form.tripStartIso, color = DesignTokens.base.onDark, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
                TextButton(onClick = { tripStartPickerOpen = true }) {
                    Text("Change", color = contextAccent)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("End", color = DesignTokens.base.onDark60, fontSize = 12.sp)
                    Text(form.tripEndIso, color = DesignTokens.base.onDark, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
                TextButton(onClick = { tripEndPickerOpen = true }) {
                    Text("Change", color = contextAccent)
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Contribution due (optional)", color = DesignTokens.base.onDark60, fontSize = 12.sp)
                    Text(
                        form.contributionDueIso.ifBlank { "—" },
                        color = DesignTokens.base.onDark,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
                Row {
                    if (form.contributionDueIso.isNotBlank()) {
                        TextButton(onClick = { form = form.copy(contributionDueIso = "") }) {
                            Text("Clear", color = DesignTokens.base.brandText)
                        }
                    }
                    TextButton(onClick = { contributionPickerOpen = true }) {
                        Text("Set", color = contextAccent)
                    }
                }
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

private fun parseIsoToMillisGroup(iso: String): Long? {
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
