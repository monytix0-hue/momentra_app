package app.momentra.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.network.GroupExpenseCreateIn
import app.momentra.network.GroupExpenseSplitLineIn
import app.momentra.network.GroupSplitMode
import app.momentra.ui.theme.DesignTokens
import kotlin.math.abs

data class GroupExpenseFormState(
    val titleInput: String = "",
    val amountInput: String = "",
    val expenseDateIso: String = "",
    val categoryKey: String? = null,
    val paidByMemberId: String? = null,
    val receiptNotes: String = "",
    val error: String? = null,
)

private val expenseSplitModeOptions: List<Pair<String, String>> = listOf(
    GroupSplitMode.EQUAL to "Equal",
    GroupSplitMode.EXACT to "Exact",
    GroupSplitMode.PERCENT to "%",
    GroupSplitMode.SHARES to "Shares",
)

private fun buildExpenseSplitLines(
    mode: String,
    memberIds: List<String>,
    amount: Double,
    equalSelected: Set<String>,
    exactMap: Map<String, String>,
    pctMap: Map<String, String>,
    shareMap: Map<String, String>,
): Pair<List<GroupExpenseSplitLineIn>, String?> {
    return when (mode) {
        GroupSplitMode.EQUAL -> {
            val chosen = memberIds.filter { it in equalSelected }
            if (chosen.isEmpty()) {
                return emptyList<GroupExpenseSplitLineIn>() to "Select at least one person included in the split"
            }
            chosen.map { GroupExpenseSplitLineIn(memberId = it, value = 1.0) } to null
        }
        GroupSplitMode.EXACT -> {
            val lines = mutableListOf<GroupExpenseSplitLineIn>()
            var sum = 0.0
            for (id in memberIds) {
                val v = exactMap[id]?.trim()?.toDoubleOrNull()
                if (v != null && v > 0) {
                    lines.add(GroupExpenseSplitLineIn(memberId = id, value = v))
                    sum += v
                }
            }
            if (lines.isEmpty()) {
                return emptyList<GroupExpenseSplitLineIn>() to "Enter each person’s share (exact amounts)"
            }
            if (abs(sum - amount) > 0.02) {
                return emptyList<GroupExpenseSplitLineIn>() to "Exact amounts must add up to the expense total (${"%.2f".format(amount)})"
            }
            lines to null
        }
        GroupSplitMode.PERCENT -> {
            val lines = mutableListOf<GroupExpenseSplitLineIn>()
            var sumPct = 0.0
            for (id in memberIds) {
                val v = pctMap[id]?.trim()?.toDoubleOrNull()
                if (v != null && v > 0) {
                    lines.add(GroupExpenseSplitLineIn(memberId = id, value = v))
                    sumPct += v
                }
            }
            if (lines.isEmpty()) {
                return emptyList<GroupExpenseSplitLineIn>() to "Enter a positive percent for each person in the split"
            }
            if (abs(sumPct - 100.0) > 0.15) {
                return emptyList<GroupExpenseSplitLineIn>() to "Percents must add up to 100 (currently ${"%.1f".format(sumPct)})"
            }
            lines to null
        }
        GroupSplitMode.SHARES -> {
            val lines = memberIds.mapNotNull { id ->
                val v = shareMap[id]?.trim()?.toDoubleOrNull()
                if (v != null && v > 0) GroupExpenseSplitLineIn(memberId = id, value = v) else null
            }
            if (lines.isEmpty()) {
                return emptyList<GroupExpenseSplitLineIn>() to "Enter a positive share (e.g. 2 and 1) for each person"
            }
            lines to null
        }
        else -> emptyList<GroupExpenseSplitLineIn>() to "Unknown split mode"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupExpenseSheet(
    contextAccent: Color,
    sheetKey: Int,
    categories: List<Pair<String, String>>,
    members: List<Pair<String, String>>,
    defaultPaidByMemberId: String?,
    defaultCategoryKey: String?,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (GroupExpenseCreateIn) -> Unit,
) {
    val memberIds = remember(sheetKey, members) { members.map { it.first } }

    var form by remember(sheetKey) {
        mutableStateOf(
            GroupExpenseFormState(
                expenseDateIso = calendarDateIso(),
                categoryKey = defaultCategoryKey ?: categories.firstOrNull()?.first,
                paidByMemberId = defaultPaidByMemberId ?: members.firstOrNull()?.first,
            ),
        )
    }

    var splitMode by remember(sheetKey) { mutableStateOf(GroupSplitMode.EQUAL) }
    var equalSelected by remember(sheetKey) {
        mutableStateOf(members.map { it.first }.toSet())
    }
    var exactMap by remember(sheetKey) {
        mutableStateOf(members.associate { it.first to "" })
    }
    var pctMap by remember(sheetKey) {
        mutableStateOf(members.associate { it.first to "" })
    }
    var shareMap by remember(sheetKey) {
        mutableStateOf(members.associate { it.first to "" })
    }

    var categoryExpanded by remember { mutableStateOf(false) }
    var memberExpanded by remember { mutableStateOf(false) }

    val selectedCategoryLabel = categories.firstOrNull { it.first == form.categoryKey }?.second ?: "Category"
    val selectedMemberLabel = members.firstOrNull { it.first == form.paidByMemberId }?.second ?: "Paid by"

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
                "Add expense",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            if (categories.isEmpty() || members.isEmpty()) {
                Spacer(Modifier.height(12.dp))
                Text(
                    "Categories or members are not loaded yet. Close this sheet, wait for the moment to load, and try again.",
                    color = DesignTokens.urgency.high,
                    fontSize = 13.sp,
                )
            }
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = form.titleInput,
                onValueChange = { form = form.copy(titleInput = it, error = null) },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = form.amountInput,
                onValueChange = { form = form.copy(amountInput = it.filter { ch -> ch.isDigit() || ch == '.' }, error = null) },
                label = { Text("Amount") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = form.expenseDateIso,
                onValueChange = { form = form.copy(expenseDateIso = it, error = null) },
                label = { Text("Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(10.dp))
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { categoryExpanded = !categoryExpanded },
            ) {
                OutlinedTextField(
                    value = selectedCategoryLabel,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Category") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                )
                DropdownMenu(
                    expanded = categoryExpanded,
                    onDismissRequest = { categoryExpanded = false },
                ) {
                    categories.forEach { (key, label) ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = {
                                form = form.copy(categoryKey = key, error = null)
                                categoryExpanded = false
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            ExposedDropdownMenuBox(
                expanded = memberExpanded,
                onExpandedChange = { memberExpanded = !memberExpanded },
            ) {
                OutlinedTextField(
                    value = selectedMemberLabel,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Paid by") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = memberExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                )
                DropdownMenu(
                    expanded = memberExpanded,
                    onDismissRequest = { memberExpanded = false },
                ) {
                    members.forEach { (id, label) ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = {
                                form = form.copy(paidByMemberId = id, error = null)
                                memberExpanded = false
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            Text("Split (this expense)", color = DesignTokens.base.onDark60, style = DesignTokens.type.caption)
            Spacer(Modifier.height(6.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                expenseSplitModeOptions.forEachIndexed { index, (mode, label) ->
                    SegmentedButton(
                        selected = splitMode == mode,
                        onClick = { splitMode = mode; form = form.copy(error = null) },
                        shape = SegmentedButtonDefaults.itemShape(index, expenseSplitModeOptions.size),
                    ) {
                        Text(label, fontSize = 11.sp, maxLines = 1)
                    }
                }
            }
            Spacer(Modifier.height(10.dp))

            when (splitMode) {
                GroupSplitMode.EQUAL -> {
                    Text(
                        "Include everyone who should owe part of this bill.",
                        color = DesignTokens.base.brandText,
                        fontSize = 12.sp,
                    )
                    Spacer(Modifier.height(6.dp))
                    members.forEach { (id, label) ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(label, color = DesignTokens.base.onDark, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            Checkbox(
                                checked = id in equalSelected,
                                onCheckedChange = { checked ->
                                    equalSelected = if (checked) {
                                        equalSelected + id
                                    } else {
                                        equalSelected - id
                                    }
                                    form = form.copy(error = null)
                                },
                            )
                        }
                    }
                }
                GroupSplitMode.EXACT -> {
                    Text(
                        "Enter how much each person owes (must match total amount).",
                        color = DesignTokens.base.brandText,
                        fontSize = 12.sp,
                    )
                    Spacer(Modifier.height(6.dp))
                    members.forEach { (id, label) ->
                        OutlinedTextField(
                            value = exactMap[id].orEmpty(),
                            onValueChange = { v ->
                                exactMap = exactMap + mapOf(id to v.filter { ch -> ch.isDigit() || ch == '.' })
                                form = form.copy(error = null)
                            },
                            label = { Text(label) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                        )
                    }
                }
                GroupSplitMode.PERCENT -> {
                    Text(
                        "Percents for everyone in the split (must total 100).",
                        color = DesignTokens.base.brandText,
                        fontSize = 12.sp,
                    )
                    Spacer(Modifier.height(6.dp))
                    members.forEach { (id, label) ->
                        OutlinedTextField(
                            value = pctMap[id].orEmpty(),
                            onValueChange = { v ->
                                pctMap = pctMap + mapOf(id to v.filter { ch -> ch.isDigit() || ch == '.' })
                                form = form.copy(error = null)
                            },
                            label = { Text("$label %") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                        )
                    }
                }
                GroupSplitMode.SHARES -> {
                    Text(
                        "Split by shares (e.g. 2 and 1). Larger share pays more of the total.",
                        color = DesignTokens.base.brandText,
                        fontSize = 12.sp,
                    )
                    Spacer(Modifier.height(6.dp))
                    members.forEach { (id, label) ->
                        OutlinedTextField(
                            value = shareMap[id].orEmpty(),
                            onValueChange = { v ->
                                shareMap = shareMap + mapOf(id to v.filter { ch -> ch.isDigit() || ch == '.' })
                                form = form.copy(error = null)
                            },
                            label = { Text("$label shares") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = form.receiptNotes,
                onValueChange = { form = form.copy(receiptNotes = it, error = null) },
                label = { Text("Note (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
            )

            form.error?.let {
                Text(it, color = DesignTokens.urgency.high, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }

            Spacer(Modifier.height(14.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 18.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = contextAccent)
                } else {
                    TextButton(
                        onClick = {
                            if (categories.isEmpty() || members.isEmpty()) {
                                form = form.copy(error = "Moment data not ready")
                                return@TextButton
                            }
                            val title = form.titleInput.trim()
                            if (title.isEmpty()) {
                                form = form.copy(error = "Enter a title")
                                return@TextButton
                            }
                            val amount = form.amountInput.trim().toDoubleOrNull()
                            if (amount == null || amount <= 0) {
                                form = form.copy(error = "Enter a valid amount")
                                return@TextButton
                            }
                            val cat = form.categoryKey
                            if (cat == null) {
                                form = form.copy(error = "Pick a category")
                                return@TextButton
                            }
                            val payer = form.paidByMemberId
                            if (payer == null) {
                                form = form.copy(error = "Pick who paid")
                                return@TextButton
                            }
                            val date = form.expenseDateIso.trim()
                            if (!date.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) {
                                form = form.copy(error = "Use date format YYYY-MM-DD")
                                return@TextButton
                            }
                            val (splitLines, splitErr) = buildExpenseSplitLines(
                                mode = splitMode,
                                memberIds = memberIds,
                                amount = amount,
                                equalSelected = equalSelected,
                                exactMap = exactMap,
                                pctMap = pctMap,
                                shareMap = shareMap,
                            )
                            if (splitErr != null) {
                                form = form.copy(error = splitErr)
                                return@TextButton
                            }
                            onSubmit(
                                GroupExpenseCreateIn(
                                    categoryKey = cat,
                                    subcategory = null,
                                    title = title,
                                    amount = amount,
                                    expenseDate = date,
                                    paidByMemberId = payer,
                                    receiptNotes = form.receiptNotes.trim().ifBlank { null },
                                    splitMode = splitMode,
                                    splitLines = splitLines,
                                ),
                            )
                        },
                    ) {
                        Text("Save expense", color = contextAccent, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
