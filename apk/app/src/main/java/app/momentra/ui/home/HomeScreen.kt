package app.momentra.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
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
import app.momentra.network.BusinessBudgetCategoryAllocPatchIn
import app.momentra.network.BusinessBudgetCategoryOut
import app.momentra.network.BusinessBudgetCreateIn
import app.momentra.network.BusinessBudgetMemberIn
import app.momentra.network.BusinessBudgetPendingApprovalOut
import app.momentra.network.BusinessBudgetPatchIn
import app.momentra.network.BusinessBudgetPoliciesIn
import app.momentra.network.BusinessBudgetReminderPrefsPatchIn
import app.momentra.network.BusinessCatalogOut
import app.momentra.network.BusinessExpenseCreateIn
import app.momentra.network.BusinessPaymentSplitIn
import app.momentra.network.BusinessVendorCreateIn
import app.momentra.network.BusinessVendorPatchIn
import app.momentra.network.PersonalCategoryOut
import app.momentra.network.PersonalMomentItemOut
import app.momentra.network.PersonalMomentPatchIn
import app.momentra.network.PersonalTransactionCreateIn
import app.momentra.network.PersonalTransactionPatchIn
import app.momentra.network.GroupExpenseCreateIn
import app.momentra.network.GroupInviteEmailIn
import app.momentra.network.GroupMomentDetailOut
import app.momentra.network.GroupMomentPatchIn
import app.momentra.network.GroupMomentRulesIn
import app.momentra.network.GroupMomentRulesOut
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraContextTabs
import app.momentra.ui.theme.MomentraPrimaryButton
import app.momentra.ui.theme.MomentraScreenChrome
import app.momentra.ui.theme.MomentraStatusBadge
import app.momentra.ui.theme.rememberMomentraThemeState
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.momentra.invite.InviteLinkKind
import app.momentra.invite.parseInvitePayload
import app.momentra.invite.parseInviteUri
import app.momentra.network.BusinessPendingInviteOut
import app.momentra.network.GroupPendingInviteOut
import java.io.File
import java.util.Calendar
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import retrofit2.HttpException

private data class HomeMomentItem(
    val id: String,
    val title: String,
    val context: MomentraContext,
    val momentType: String? = null,
    val status: String? = null,
    val targetAmount: Double? = null,
    val durationType: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val description: String? = null,
    val savingMode: String? = null,
    val isPrivateMoment: Boolean = true,
    val splitMode: String? = null,
    val businessPendingApprovalsCount: Int = 0,
)

private data class HomeDataState(
    val loading: Boolean = false,
    val error: String? = null,
    val personalNetBalance: Double? = null,
    val personalItems: List<HomeMomentItem> = emptyList(),
    val groupItems: List<HomeMomentItem> = emptyList(),
    val businessItems: List<HomeMomentItem> = emptyList(),
)

private data class GroupExpenseListItem(
    val expenseId: String,
    val title: String,
    val subtitle: String,
    val amount: Double,
)

private data class DetailState(
    val loading: Boolean = false,
    val error: String? = null,
    val title: String = "",
    val lines: List<Pair<String, String>> = emptyList(),
    val recentTransactions: List<PersonalTxnItem> = emptyList(),
    val groupJoinUrl: String? = null,
    val groupMembersForPicker: List<Pair<String, String>> = emptyList(),
    val groupCategoriesForPicker: List<Pair<String, String>> = emptyList(),
    val groupExpenses: List<GroupExpenseListItem> = emptyList(),
    val groupDefaultPaidByMemberId: String? = null,
    val groupDefaultCategoryKey: String? = null,
    val businessCategoriesForPicker: List<Pair<String, String>> = emptyList(),
    val businessTeamMembers: List<Pair<String, String>> = emptyList(),
    val businessVendorNames: List<String> = emptyList(),
    val businessVendorRecords: List<BusinessVendorRecordRow> = emptyList(),
    val businessVendorBalances: List<BusinessVendorBalanceRow> = emptyList(),
    val businessCanInviteMembers: Boolean = false,
    val businessCanApproveApprovals: Boolean = false,
    val businessPendingApprovals: List<BusinessBudgetPendingApprovalOut> = emptyList(),
)

private data class BusinessVendorRecordRow(
    val vendorId: String,
    val vendorName: String,
)

private data class BusinessVendorBalanceRow(
    val vendorName: String,
    val totalAmount: Double,
    val paidAmount: Double,
    val balanceAmount: Double,
)

private data class BusinessReceiptSelection(
    val file: java.io.File,
    val mimeType: String,
    val displayName: String,
)

private val EXPENSE_CATEGORY_SUBCATEGORY_MAP: Map<String, List<String>> = mapOf(
    "Operations" to listOf("Rent", "Utilities", "Maintenance", "Office Supplies"),
    "Marketing" to listOf("Digital Ads", "Print Ads", "Promotions", "Branding"),
    "Payroll" to listOf("Salaries", "Contractors", "Bonuses", "Staff Welfare"),
    "Logistics" to listOf("Fuel", "Transport", "Delivery", "Packaging"),
)

private val PURCHASE_CATEGORY_SUBCATEGORY_MAP: Map<String, List<String>> = mapOf(
    "Raw Materials" to listOf("Seeds", "Oil Cakes", "Ingredients", "Bulk Inputs"),
    "Inventory Stock" to listOf("Finished Goods", "Retail Stock", "Wholesale Stock"),
    "Packaging Purchase" to listOf("Bottles", "Labels", "Boxes", "Pouches"),
    "Equipment Purchase" to listOf("Machinery", "Tools", "Spare Parts", "Appliances"),
)

private data class PersonalTxnItem(
    val transactionId: String,
    val title: String,
    val subtitle: String,
    val amount: Double,
    val isIncome: Boolean,
    val categoryName: String,
    val subcategoryId: String?,
    val note: String,
    val txnDateIso: String,
)

private data class PersonalTxnFormState(
    val editingTransactionId: String? = null,
    val isIncome: Boolean = false,
    val amountInput: String = "",
    val titleInput: String = "",
    val noteInput: String = "",
    val txnDateInput: String = "",
    val selectedCategoryId: String? = null,
    val selectedSubcategoryId: String? = null,
    val loading: Boolean = false,
    val error: String? = null,
)

private data class PersonalMomentSettingsState(
    val title: String = "",
    val targetAmountInput: String = "",
    val rhythmMonthly: Boolean = true,
    val startDateInput: String = "",
    val endDateInput: String = "",
    val description: String = "",
    val savingMode: String = "",
    val isPrivateMoment: Boolean = true,
    val loading: Boolean = false,
    val error: String? = null,
)

private data class GroupMomentSettingsState(
    val title: String = "",
    val targetAmountInput: String = "",
    val destination: String = "",
    val contributionDueDate: String = "",
    val status: String = "active",
    val sendPaymentReminders: Boolean = true,
    val autoNotifyOnContribution: Boolean = true,
    val allowPartialPayments: Boolean = true,
    val requireReceiptForExpenses: Boolean = false,
    val requireOrganiserApproval: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null,
)

private data class BusinessCategoryAllocInput(
    val categoryId: String,
    val categoryName: String,
    val amountInput: String,
)

private data class BusinessMomentSettingsState(
    val budgetName: String = "",
    val totalBudgetInput: String = "",
    val budgetPeriod: String = "",
    val department: String = "",
    val approvalThresholdInput: String = "",
    val requireReceiptForAllExpenses: Boolean = false,
    val autoApproveBelowThreshold: Boolean = true,
    val managerApprovalRequired: Boolean = true,
    val notifyAdminOnSubmission: Boolean = true,
    val overBudgetAlerts: Boolean = true,
    val lockBudgetWhenLimitHit: Boolean = false,
    val weeklyDigest: Boolean = true,
    val pendingApprovalAlerts: Boolean = true,
    val reminderOverBudgetAlerts: Boolean = true,
    val periodCloseReminder: Boolean = true,
    val categoryAllocations: List<BusinessCategoryAllocInput> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
)

@Composable
fun HomeScreen(
    authRepository: AuthRepository,
    initialContext: MomentraContext = MomentraContext.Personal,
    onSignOut: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val appContext = LocalContext.current
    var selectedContext by remember { mutableStateOf(initialContext) }
    var selectedMoment by remember { mutableStateOf<HomeMomentItem?>(null) }
    var dataState by remember { mutableStateOf(HomeDataState()) }
    var detailState by remember { mutableStateOf(DetailState()) }
    var showTxnSheet by remember { mutableStateOf(false) }
    var formState by remember { mutableStateOf(PersonalTxnFormState()) }
    var editingTxnSnapshot by remember { mutableStateOf<PersonalTxnItem?>(null) }
    var showDeleteTxnAlert by remember { mutableStateOf(false) }
    var showSettingsSheet by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var personalSettingsState by remember { mutableStateOf(PersonalMomentSettingsState()) }
    var showCreateMomentSheet by remember { mutableStateOf(false) }
    var createMomentPreset by remember { mutableStateOf<PersonalQuickTemplate?>(null) }
    var createSheetKey by remember { mutableIntStateOf(0) }
    var createMomentSubmitting by remember { mutableStateOf(false) }
    var showCreateGroupMomentSheet by remember { mutableStateOf(false) }
    var createGroupPreset by remember { mutableStateOf<GroupQuickTemplate?>(null) }
    var createGroupSheetKey by remember { mutableIntStateOf(0) }
    var createGroupMomentSubmitting by remember { mutableStateOf(false) }
    var showCreateBusinessMomentSheet by remember { mutableStateOf(false) }
    var createBusinessPreset by remember { mutableStateOf<BusinessQuickTemplate?>(null) }
    var createBusinessSheetKey by remember { mutableIntStateOf(0) }
    var createBusinessMomentSubmitting by remember { mutableStateOf(false) }
    var showGroupExpenseSheet by remember { mutableStateOf(false) }
    var groupExpenseSheetKey by remember { mutableIntStateOf(0) }
    var groupExpenseSubmitting by remember { mutableStateOf(false) }
    var showGroupInviteSheet by remember { mutableStateOf(false) }
    var groupInviteSheetKey by remember { mutableIntStateOf(0) }
    var groupEmailSending by remember { mutableStateOf(false) }
    var groupEmailResultMessage by remember { mutableStateOf<String?>(null) }
    var showBusinessInviteSheet by remember { mutableStateOf(false) }
    var businessInviteSheetKey by remember { mutableIntStateOf(0) }
    var businessEmailSending by remember { mutableStateOf(false) }
    var businessEmailResultMessage by remember { mutableStateOf<String?>(null) }
    var businessShareJoinUrl by remember { mutableStateOf<String?>(null) }
    var businessPendingInvites by remember { mutableStateOf<List<BusinessPendingInviteOut>>(emptyList()) }
    var groupPendingInvites by remember { mutableStateOf<List<GroupPendingInviteOut>>(emptyList()) }
    var showInviteQrScanner by remember { mutableStateOf(false) }
    val handledDeepLinkKeys = remember { mutableSetOf<String>() }
    val lifecycleOwner = LocalLifecycleOwner.current
    val activity = LocalContext.current as ComponentActivity
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            showInviteQrScanner = true
        } else {
            Toast.makeText(appContext, "Camera permission is needed to scan QR codes", Toast.LENGTH_SHORT).show()
        }
    }
    var showBusinessMemberSheet by remember { mutableStateOf(false) }
    var businessMemberSheetKey by remember { mutableIntStateOf(0) }
    var businessMemberSubmitting by remember { mutableStateOf(false) }
    var showBusinessExpenseSheet by remember { mutableStateOf(false) }
    var businessExpenseSheetKey by remember { mutableIntStateOf(0) }
    var businessExpenseSubmitting by remember { mutableStateOf(false) }
    var businessApprovalSubmittingId by remember { mutableStateOf<String?>(null) }
    var businessExpenseKind by remember { mutableStateOf("expense") }
    var businessCatalog by remember { mutableStateOf<BusinessCatalogOut?>(null) }
    var groupSettingsState by remember { mutableStateOf(GroupMomentSettingsState()) }
    var businessSettingsState by remember { mutableStateOf(BusinessMomentSettingsState()) }
    var categoryOptions by remember { mutableStateOf<List<PersonalCategoryOut>>(emptyList()) }
    val userName = authRepository.currentUser?.displayName?.takeIf { it.isNotBlank() } ?: "User"
    val momentraTheme = rememberMomentraThemeState(selectedContext)
    val contextTheme = momentraTheme.contextTheme
    val contextActionStyle = momentraTheme.actionStyle(status = null)
    val selectedActionStyle = DesignTokens.actionStyle(
        context = selectedMoment?.context ?: selectedContext,
        status = selectedMoment?.status,
    )
    val emptyTemplates = remember(selectedContext) { homeEmptyTemplates(selectedContext) }

    fun mapPersonalMoment(it: PersonalMomentItemOut): HomeMomentItem {
        return HomeMomentItem(
            id = it.momentId,
            title = it.title,
            context = MomentraContext.Personal,
            momentType = it.momentType,
            status = it.status,
            targetAmount = it.targetAmount,
            durationType = it.durationType,
            startDate = it.startDate,
            endDate = it.endDate,
            description = it.description,
            savingMode = it.savingMode,
            isPrivateMoment = it.isPrivateMoment,
        )
    }

    fun mapGroupMoment(it: app.momentra.network.GroupMomentOut): HomeMomentItem {
        return HomeMomentItem(
            id = it.momentId,
            title = it.title,
            context = MomentraContext.Group,
            momentType = it.momentType,
            status = it.status,
            targetAmount = it.targetAmount ?: it.raisedAmount,
            endDate = it.contributionDueDate,
            description = it.destination,
            splitMode = it.splitMode,
        )
    }

    fun mapBusinessMoment(it: app.momentra.network.BusinessBudgetCreateOut): HomeMomentItem {
        return HomeMomentItem(
            id = it.budgetId,
            title = it.budgetName,
            context = MomentraContext.Business,
            momentType = it.budgetType,
            status = it.status,
            targetAmount = it.totalBudget,
            description = it.department,
            savingMode = it.budgetPeriod,
            businessPendingApprovalsCount = it.pendingApprovals.size,
        )
    }

    fun buildBusinessDetailState(
        detail: app.momentra.network.BusinessBudgetCreateOut?,
        fallbackTitle: String,
    ): DetailState {
        val myUid = authRepository.currentUser?.uid
        val myRole = detail?.teamMembers
            .orEmpty()
            .firstOrNull { it.firebaseUid == myUid }
            ?.role
            ?.trim()
            ?.lowercase()
        val canInviteMembers = myRole in setOf("owner", "admin", "manager", "finance")
        val canApproveApprovals = myRole in setOf("owner", "admin", "manager", "finance")
        val categories = detail?.categories.orEmpty().map { it.categoryId to it.name }
        val team = detail?.teamMembers.orEmpty().map {
            it.memberId to "${it.displayName} (${it.role.replaceFirstChar { ch -> ch.uppercase() }})"
        }
        val vendorBalances = detail?.vendorBalances.orEmpty().map {
            BusinessVendorBalanceRow(
                vendorName = it.vendorName,
                totalAmount = it.totalAmount,
                paidAmount = it.paidAmount,
                balanceAmount = it.balanceAmount,
            )
        }
        val vendorRecords = detail?.vendors.orEmpty()
            .filter { it.vendorId.isNotBlank() && it.vendorName.isNotBlank() }
            .map { BusinessVendorRecordRow(vendorId = it.vendorId, vendorName = it.vendorName) }
        val vendorNames = (
            detail?.vendors.orEmpty().map { it.vendorName } +
                vendorBalances.map { it.vendorName }
            ).map { it.trim() }.filter { it.isNotBlank() }.distinct()
        return DetailState(
            loading = false,
            title = detail?.budgetName ?: fallbackTitle,
            lines = listOf(
                "Context" to "Business",
                "Type" to (detail?.budgetType ?: "N/A"),
                "Total Budget" to DesignTokens.formatInr(detail?.totalBudget ?: 0.0),
                "Spent" to DesignTokens.formatInr(detail?.spentAmount ?: 0.0),
                "Status" to (detail?.status ?: "N/A"),
                "Pending approvals" to "${detail?.pendingApprovals?.size ?: 0}",
            ),
            businessCategoriesForPicker = categories,
            businessTeamMembers = team,
            businessVendorNames = vendorNames,
            businessVendorRecords = vendorRecords,
            businessVendorBalances = vendorBalances,
            businessCanInviteMembers = canInviteMembers,
            businessCanApproveApprovals = canApproveApprovals,
            businessPendingApprovals = detail?.pendingApprovals.orEmpty(),
        )
    }

    fun buildGroupDetailState(detail: GroupMomentDetailOut, fallbackTitle: String, myUid: String?): DetailState {
        val m = detail.moment
        val joined = detail.members.filter { it.status == "joined" }
        val membersPick = joined.map {
            it.memberId to (it.displayName?.takeIf { n -> n.isNotBlank() } ?: it.email ?: "Member")
        }
        val catPick = detail.budgetCategories.map { it.categoryKey to it.displayName }
        val expenses = detail.expenses.map { e ->
            GroupExpenseListItem(
                expenseId = e.expenseId,
                title = e.title,
                subtitle = listOf(
                    e.categoryKey,
                    e.expenseDate,
                    e.paidByName ?: "",
                    groupSplitLabel(e.splitMode),
                ).filter { it.isNotBlank() }.joinToString(" · "),
                amount = e.amount,
            )
        }
        val spent = detail.totals?.spentExpensesAmount ?: detail.expenses.sumOf { it.amount }
        val defaultPaid = joined.firstOrNull { it.firebaseUid == myUid }?.memberId ?: joined.firstOrNull()?.memberId
        return DetailState(
            loading = false,
            title = m.title.ifBlank { fallbackTitle },
            lines = listOf(
                "Context" to "Group",
                "Type" to m.momentType,
                "Split" to groupSplitLabel(m.splitMode),
                "Raised" to DesignTokens.formatInr(m.raisedAmount),
                "Spent" to DesignTokens.formatInr(spent),
                "Status" to m.status,
            ),
            groupJoinUrl = m.joinUrl.ifBlank { null },
            groupMembersForPicker = membersPick,
            groupCategoriesForPicker = catPick,
            groupExpenses = expenses,
            groupDefaultPaidByMemberId = defaultPaid,
            groupDefaultCategoryKey = catPick.firstOrNull()?.first,
        )
    }

    suspend fun refreshPersonalMoments() {
        val home = authRepository.personalHome()
        val moments = authRepository.personalMoments()
        if (home.isFailure || moments.isFailure) {
            dataState = dataState.copy(
                personalNetBalance = home.getOrNull()?.netBalance ?: dataState.personalNetBalance,
                personalItems = moments.getOrNull()?.moments.orEmpty().map { mapPersonalMoment(it) },
                error = home.exceptionOrNull()?.message ?: moments.exceptionOrNull()?.message,
            )
            return
        }
        dataState = dataState.copy(
            error = null,
            personalNetBalance = home.getOrNull()?.netBalance,
            personalItems = moments.getOrNull()?.moments.orEmpty().map { mapPersonalMoment(it) },
        )
    }

    suspend fun refreshGroupMoments() {
        val groups = authRepository.groupMoments()
        if (groups.isFailure) {
            dataState = dataState.copy(error = groups.exceptionOrNull()?.message)
            return
        }
        dataState = dataState.copy(
            error = null,
            groupItems = groups.getOrNull()?.moments.orEmpty().map { mapGroupMoment(it) },
        )
    }

    suspend fun refreshBusinessMoments() {
        val business = authRepository.businessMoments()
        if (business.isFailure) {
            dataState = dataState.copy(error = business.exceptionOrNull()?.message)
            return
        }
        dataState = dataState.copy(
            error = null,
            businessItems = business.getOrNull()?.budgets.orEmpty().map { mapBusinessMoment(it) },
        )
    }

    suspend fun refreshBusinessCatalog(budgetId: String) {
        val catalogResult = authRepository.businessBudgetCatalog(budgetId)
        businessCatalog = catalogResult.getOrNull()
    }

    suspend fun refreshPersonalDetail(moment: HomeMomentItem) {
        val txns = authRepository.personalTransactions(limit = 8)
        detailState = DetailState(
            loading = false,
            title = moment.title,
            lines = listOf(
                "Context" to "Personal",
                "Type" to (moment.momentType ?: "N/A"),
                "Rhythm" to personalRhythmLabel(moment.durationType.orEmpty(), moment.endDate),
                "Status" to (moment.status ?: "N/A"),
                "Target" to DesignTokens.formatInr(moment.targetAmount ?: 0.0),
                "Start date" to (moment.startDate ?: "N/A"),
                "End date" to (moment.endDate ?: "N/A"),
                "Saving mode" to (moment.savingMode ?: "N/A"),
                "Privacy" to if (moment.isPrivateMoment) "Private" else "Shared",
            ),
            recentTransactions = txns.getOrNull()?.transactions.orEmpty().map {
                PersonalTxnItem(
                    transactionId = it.transactionId,
                    title = it.title,
                    subtitle = it.subtitle,
                    amount = it.amount,
                    isIncome = it.isIncome,
                    categoryName = it.category.orEmpty(),
                    subcategoryId = it.subcategoryId,
                    note = it.note.orEmpty(),
                    txnDateIso = it.txnDate.orEmpty(),
                )
            },
        )
    }

    suspend fun reloadMoments() {
        dataState = dataState.copy(loading = true, error = null)
        dataState = when (selectedContext) {
            MomentraContext.Personal -> {
                val home = authRepository.personalHome()
                val moments = authRepository.personalMoments()
                if (home.isFailure || moments.isFailure) {
                    dataState.copy(
                        loading = false,
                        error = home.exceptionOrNull()?.message ?: moments.exceptionOrNull()?.message,
                    )
                } else {
                    dataState.copy(
                        loading = false,
                        personalNetBalance = home.getOrNull()?.netBalance,
                        personalItems = moments.getOrNull()?.moments.orEmpty().map { mapPersonalMoment(it) },
                    )
                }
            }
            MomentraContext.Group -> {
                val groups = authRepository.groupMoments()
                if (groups.isFailure) {
                    dataState.copy(loading = false, error = groups.exceptionOrNull()?.message)
                } else {
                    dataState.copy(
                        loading = false,
                        groupItems = groups.getOrNull()?.moments.orEmpty().map { mapGroupMoment(it) },
                    )
                }
            }
            MomentraContext.Business -> {
                val business = authRepository.businessMoments()
                if (business.isFailure) {
                    dataState.copy(loading = false, error = business.exceptionOrNull()?.message)
                } else {
                    dataState.copy(
                        loading = false,
                        businessItems = business.getOrNull()?.budgets.orEmpty().map { mapBusinessMoment(it) },
                    )
                }
            }
            MomentraContext.Circle -> dataState.copy(loading = false, error = null)
        }
    }

    LaunchedEffect(selectedContext) {
        reloadMoments()
    }

    LaunchedEffect(selectedMoment) {
        val moment = selectedMoment ?: return@LaunchedEffect
        detailState = DetailState(loading = true, title = moment.title)
        detailState = when (moment.context) {
            MomentraContext.Personal -> {
                refreshPersonalDetail(moment)
                detailState
            }
            MomentraContext.Group -> {
                val result = authRepository.groupMomentDetail(moment.id)
                val uid = authRepository.currentUser?.uid
                if (result.isFailure) {
                    DetailState(loading = false, error = result.exceptionOrNull()?.message, title = moment.title)
                } else {
                    val body = result.getOrNull()
                    if (body != null) {
                        buildGroupDetailState(body, moment.title, uid)
                    } else {
                        DetailState(loading = false, title = moment.title, error = "No detail")
                    }
                }
            }
            MomentraContext.Business -> {
                val result = authRepository.businessMomentDetail(moment.id)
                if (result.isFailure) {
                    businessCatalog = null
                    DetailState(loading = false, error = result.exceptionOrNull()?.message, title = moment.title)
                } else {
                    refreshBusinessCatalog(moment.id)
                    buildBusinessDetailState(result.getOrNull(), moment.title)
                }
            }
            MomentraContext.Circle -> DetailState(
                loading = false,
                title = moment.title,
                lines = listOf("Context" to "Circle", "Status" to "Coming soon"),
            )
        }
    }

    LaunchedEffect(showTxnSheet, formState.isIncome) {
        if (!showTxnSheet) return@LaunchedEffect
        val kind = if (formState.isIncome) "income" else "expense"
        val result = authRepository.personalCategories(kind = kind)
        if (result.isSuccess) {
            categoryOptions = result.getOrNull()?.categories.orEmpty()
            val snap = editingTxnSnapshot
            if (snap != null && snap.transactionId == formState.editingTransactionId) {
                val cat = categoryOptions.firstOrNull { it.name.equals(snap.categoryName, ignoreCase = true) }
                val subId = snap.subcategoryId?.takeIf { sid ->
                    cat?.subcategories?.any { it.subcategoryId == sid } == true
                }
                formState = formState.copy(
                    selectedCategoryId = cat?.categoryId,
                    selectedSubcategoryId = subId ?: cat?.subcategories?.firstOrNull()?.subcategoryId,
                    error = null,
                )
            } else if (formState.editingTransactionId == null) {
                val initialCategory = categoryOptions.firstOrNull()
                formState = formState.copy(
                    selectedCategoryId = formState.selectedCategoryId ?: initialCategory?.categoryId,
                    selectedSubcategoryId = formState.selectedSubcategoryId
                        ?: initialCategory?.subcategories?.firstOrNull()?.subcategoryId,
                    error = null,
                )
            } else {
                formState = formState.copy(error = null)
            }
        } else {
            categoryOptions = emptyList()
            formState = formState.copy(error = result.exceptionOrNull()?.message ?: "Failed to load categories")
        }
    }

    LaunchedEffect(showGroupInviteSheet, selectedMoment?.id) {
        if (!showGroupInviteSheet || selectedMoment?.context != MomentraContext.Group) return@LaunchedEffect
        val id = selectedMoment?.id ?: return@LaunchedEffect
        if (!detailState.groupJoinUrl.isNullOrBlank()) return@LaunchedEffect
        val r = authRepository.groupInviteLink(id)
        if (r.isSuccess) {
            val url = r.getOrNull()?.joinUrl?.ifBlank { null } ?: return@LaunchedEffect
            detailState = detailState.copy(groupJoinUrl = url)
        }
    }

    LaunchedEffect(selectedContext, selectedMoment) {
        if (selectedMoment != null) return@LaunchedEffect
        when (selectedContext) {
            MomentraContext.Business -> {
                val r = authRepository.businessPendingInvites()
                businessPendingInvites = r.getOrNull()?.invites.orEmpty()
            }
            MomentraContext.Group -> {
                businessCatalog = null
                val r = authRepository.groupPendingInvites()
                groupPendingInvites = r.getOrNull()?.invites.orEmpty()
            }
            else -> {
                businessCatalog = null
            }
        }
    }

    LaunchedEffect(showBusinessInviteSheet, selectedMoment?.id) {
        if (!showBusinessInviteSheet || selectedMoment?.context != MomentraContext.Business) return@LaunchedEffect
        val id = selectedMoment?.id ?: return@LaunchedEffect
        if (!businessShareJoinUrl.isNullOrBlank()) return@LaunchedEffect
        val r = authRepository.businessInviteLink(id)
        if (r.isSuccess) {
            businessShareJoinUrl = r.getOrNull()?.joinUrl?.ifBlank { null }
        }
    }

    DisposableEffect(lifecycleOwner, activity) {
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            val uri = activity.intent?.data ?: return@LifecycleEventObserver
            val key = uri.toString()
            if (!handledDeepLinkKeys.add(key)) return@LifecycleEventObserver
            val parsed = parseInviteUri(uri)
            if (parsed == null) {
                handledDeepLinkKeys.remove(key)
                return@LifecycleEventObserver
            }
            scope.launch {
                val result = when (parsed.kind) {
                    InviteLinkKind.BUSINESS -> authRepository.joinBusinessWithToken(parsed.token)
                    InviteLinkKind.GROUP -> authRepository.joinGroupWithToken(parsed.token)
                }
                if (result.isSuccess) {
                    Toast.makeText(appContext, "You're in!", Toast.LENGTH_SHORT).show()
                    selectedContext = when (parsed.kind) {
                        InviteLinkKind.BUSINESS -> MomentraContext.Business
                        InviteLinkKind.GROUP -> MomentraContext.Group
                    }
                    reloadMoments()
                    when (parsed.kind) {
                        InviteLinkKind.BUSINESS -> {
                            val pend = authRepository.businessPendingInvites()
                            businessPendingInvites = pend.getOrNull()?.invites.orEmpty()
                        }
                        InviteLinkKind.GROUP -> {
                            val pend = authRepository.groupPendingInvites()
                            groupPendingInvites = pend.getOrNull()?.invites.orEmpty()
                        }
                    }
                } else {
                    handledDeepLinkKeys.remove(key)
                    Toast.makeText(
                        appContext,
                        result.exceptionOrNull()?.message ?: "Could not join from link",
                        Toast.LENGTH_LONG,
                    ).show()
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    MomentraScreenChrome(
        context = selectedContext,
        modifier = Modifier.fillMaxSize(),
    ) { _ ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.spacing.screenH, vertical = 12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        text = "Good ${timeOfDayLabel()}, $userName",
                        color = DesignTokens.base.onDark,
                        fontSize = 36.sp,
                        lineHeight = 40.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Welcome back",
                        color = DesignTokens.base.onDark60,
                        style = DesignTokens.type.body,
                    )
                }
                TextButton(onClick = onSignOut) {
                    Text("Sign out", color = DesignTokens.base.onDark60, style = DesignTokens.type.caption)
                }
            }

            MomentraContextTabs(
                selectedContext = selectedContext,
                onSelect = { context ->
                    selectedMoment = null
                    showSettingsSheet = false
                    showDeleteConfirm = false
                    selectedContext = context
                },
                modifier = Modifier.padding(top = 14.dp),
            )

            if (selectedContext == MomentraContext.Business &&
                selectedMoment == null &&
                businessPendingInvites.isNotEmpty()
            ) {
                businessPendingInvites.forEach { inv ->
                    Column(
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(DesignTokens.radius.card))
                            .background(DesignTokens.base.s100)
                            .padding(14.dp),
                    ) {
                        Text(
                            "You're invited · ${inv.budgetName}",
                            color = DesignTokens.base.onDark,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                        Text(
                            "Role: ${inv.role}",
                            color = DesignTokens.base.brandText,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                        Row(modifier = Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        val r = authRepository.joinBusinessBudget(inv.budgetId)
                                        if (r.isSuccess) {
                                            Toast.makeText(appContext, "Joined ${inv.budgetName}", Toast.LENGTH_SHORT).show()
                                            businessPendingInvites =
                                                authRepository.businessPendingInvites().getOrNull()?.invites.orEmpty()
                                            reloadMoments()
                                            selectedMoment = dataState.businessItems.firstOrNull { it.id == inv.budgetId }
                                        } else {
                                            val alt = authRepository.joinBusinessWithToken(inv.inviteToken)
                                            if (alt.isSuccess) {
                                                Toast.makeText(appContext, "Joined ${inv.budgetName}", Toast.LENGTH_SHORT).show()
                                                businessPendingInvites =
                                                    authRepository.businessPendingInvites().getOrNull()?.invites.orEmpty()
                                                reloadMoments()
                                                selectedMoment = dataState.businessItems.firstOrNull { it.id == inv.budgetId }
                                            } else {
                                                Toast.makeText(
                                                    appContext,
                                                    alt.exceptionOrNull()?.message
                                                        ?: r.exceptionOrNull()?.message
                                                        ?: "Join failed",
                                                    Toast.LENGTH_LONG,
                                                ).show()
                                            }
                                        }
                                    }
                                },
                            ) {
                                Text("Accept invite", color = contextTheme.accent)
                            }
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        val r = authRepository.declineBusinessInvite(inv.memberId)
                                        if (r.isSuccess) {
                                            businessPendingInvites = businessPendingInvites.filterNot { it.memberId == inv.memberId }
                                            Toast.makeText(appContext, "Invite declined", Toast.LENGTH_SHORT).show()
                                        } else {
                                            Toast.makeText(
                                                appContext,
                                                r.exceptionOrNull()?.message ?: "Decline failed",
                                                Toast.LENGTH_LONG,
                                            ).show()
                                        }
                                    }
                                },
                            ) {
                                Text("Decline", color = DesignTokens.base.onDark60)
                            }
                        }
                    }
                }
            }

            if (selectedContext == MomentraContext.Group &&
                selectedMoment == null &&
                groupPendingInvites.isNotEmpty()
            ) {
                groupPendingInvites.forEach { inv ->
                    Column(
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(DesignTokens.radius.card))
                            .background(DesignTokens.base.s100)
                            .padding(14.dp),
                    ) {
                        Text(
                            "You're invited · ${inv.momentTitle}",
                            color = DesignTokens.base.onDark,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                        Row(modifier = Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        val r = authRepository.joinGroupWithToken(inv.inviteToken)
                                        if (r.isSuccess) {
                                            Toast.makeText(appContext, "Joined ${inv.momentTitle}", Toast.LENGTH_SHORT).show()
                                            groupPendingInvites =
                                                authRepository.groupPendingInvites().getOrNull()?.invites.orEmpty()
                                            reloadMoments()
                                            selectedMoment = dataState.groupItems.firstOrNull { it.id == inv.momentId }
                                        } else {
                                            Toast.makeText(
                                                appContext,
                                                r.exceptionOrNull()?.message ?: "Join failed",
                                                Toast.LENGTH_LONG,
                                            ).show()
                                        }
                                    }
                                },
                            ) {
                                Text("Accept invite", color = contextTheme.accent)
                            }
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        val r = authRepository.declineGroupInvite(inv.inviteId)
                                        if (r.isSuccess) {
                                            groupPendingInvites = groupPendingInvites.filterNot { it.inviteId == inv.inviteId }
                                            Toast.makeText(appContext, "Invite declined", Toast.LENGTH_SHORT).show()
                                        } else {
                                            Toast.makeText(
                                                appContext,
                                                r.exceptionOrNull()?.message ?: "Decline failed",
                                                Toast.LENGTH_LONG,
                                            ).show()
                                        }
                                    }
                                },
                            ) {
                                Text("Decline", color = DesignTokens.base.onDark60)
                            }
                        }
                    }
                }
            }

            if (selectedMoment == null &&
                (selectedContext == MomentraContext.Business || selectedContext == MomentraContext.Group)
            ) {
                Row(modifier = Modifier.padding(top = 10.dp)) {
                    TextButton(
                        onClick = {
                            val ok = ContextCompat.checkSelfPermission(
                                appContext,
                                Manifest.permission.CAMERA,
                            ) == PackageManager.PERMISSION_GRANTED
                            if (ok) {
                                showInviteQrScanner = true
                            } else {
                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                        },
                    ) {
                        Text("Scan invite QR", color = contextTheme.accent)
                    }
                }
            }

            if (selectedMoment != null) {
                MomentDetailsView(
                    detailState = detailState,
                    accent = selectedActionStyle.solid,
                    isPersonal = selectedMoment?.context == MomentraContext.Personal,
                    isGroup = selectedMoment?.context == MomentraContext.Group,
                    isBusiness = selectedMoment?.context == MomentraContext.Business,
                    onBack = { selectedMoment = null },
                    onAddGroupExpense = {
                        groupExpenseSheetKey++
                        showGroupExpenseSheet = true
                    },
                    onInviteGroupPeople = {
                        groupInviteSheetKey++
                        groupEmailResultMessage = null
                        showGroupInviteSheet = true
                    },
                    onInviteBusinessShare = {
                        businessInviteSheetKey++
                        businessEmailResultMessage = null
                        businessShareJoinUrl = null
                        showBusinessInviteSheet = true
                    },
                    onAddBusinessExpense = {
                        businessExpenseKind = "expense"
                        businessExpenseSheetKey++
                        showBusinessExpenseSheet = true
                    },
                    onAddBusinessPurchase = {
                        businessExpenseKind = "purchase"
                        businessExpenseSheetKey++
                        showBusinessExpenseSheet = true
                    },
                    businessApprovalSubmittingId = businessApprovalSubmittingId,
                    onApproveBusinessApproval = { approvalId ->
                        val budgetId = selectedMoment?.id ?: return@MomentDetailsView
                        scope.launch {
                            businessApprovalSubmittingId = approvalId
                            val result = authRepository.approveBusinessBudgetApproval(budgetId, approvalId)
                            businessApprovalSubmittingId = null
                            if (result.isSuccess) {
                                val updated = result.getOrNull()?.let { mapBusinessMoment(it) }
                                if (updated != null) selectedMoment = updated
                                refreshBusinessMoments()
                                val detail = authRepository.businessMomentDetail(budgetId)
                                if (detail.isSuccess) {
                                    refreshBusinessCatalog(budgetId)
                                    detailState = buildBusinessDetailState(detail.getOrNull(), selectedMoment?.title.orEmpty())
                                }
                            } else {
                                Toast.makeText(
                                    appContext,
                                    readableApiError(result.exceptionOrNull()),
                                    Toast.LENGTH_LONG,
                                ).show()
                            }
                        }
                    },
                    onRejectBusinessApproval = { approvalId ->
                        val budgetId = selectedMoment?.id ?: return@MomentDetailsView
                        scope.launch {
                            businessApprovalSubmittingId = approvalId
                            val result = authRepository.rejectBusinessBudgetApproval(budgetId, approvalId)
                            businessApprovalSubmittingId = null
                            if (result.isSuccess) {
                                val updated = result.getOrNull()?.let { mapBusinessMoment(it) }
                                if (updated != null) selectedMoment = updated
                                refreshBusinessMoments()
                                val detail = authRepository.businessMomentDetail(budgetId)
                                if (detail.isSuccess) {
                                    refreshBusinessCatalog(budgetId)
                                    detailState = buildBusinessDetailState(detail.getOrNull(), selectedMoment?.title.orEmpty())
                                }
                            } else {
                                Toast.makeText(
                                    appContext,
                                    readableApiError(result.exceptionOrNull()),
                                    Toast.LENGTH_LONG,
                                ).show()
                            }
                        }
                    },
                    onTransactionTap = { item ->
                        editingTxnSnapshot = item
                        formState = PersonalTxnFormState(
                            editingTransactionId = item.transactionId,
                            isIncome = item.isIncome,
                            amountInput = formatTxnAmount(item.amount),
                            titleInput = item.title,
                            noteInput = item.note,
                            txnDateInput = item.txnDateIso.ifBlank { calendarDateIso() },
                        )
                        showTxnSheet = true
                    },
                    onOpenSettings = {
                        val moment = selectedMoment ?: return@MomentDetailsView
                        when (moment.context) {
                            MomentraContext.Personal -> {
                                personalSettingsState = PersonalMomentSettingsState(
                                    title = moment.title,
                                    targetAmountInput = moment.targetAmount?.toString().orEmpty(),
                                    rhythmMonthly = moment.durationType == PersonalMomentDuration.RECURRING_MONTHLY,
                                    startDateInput = moment.startDate.orEmpty(),
                                    endDateInput = moment.endDate.orEmpty(),
                                    description = moment.description.orEmpty(),
                                    savingMode = moment.savingMode.orEmpty(),
                                    isPrivateMoment = moment.isPrivateMoment,
                                )
                                showSettingsSheet = true
                            }
                            MomentraContext.Group -> {
                                scope.launch {
                                    val detail = authRepository.groupMomentDetail(moment.id)
                                    if (detail.isSuccess) {
                                        val body = detail.getOrNull()
                                        val m = body?.moment
                                        val rules = body?.rules ?: GroupMomentRulesOut()
                                        groupSettingsState = GroupMomentSettingsState(
                                            title = m?.title ?: moment.title,
                                            targetAmountInput = (m?.targetAmount ?: moment.targetAmount)?.toString().orEmpty(),
                                            destination = m?.destination.orEmpty(),
                                            contributionDueDate = m?.contributionDueDate.orEmpty(),
                                            status = m?.status ?: "active",
                                            sendPaymentReminders = rules.sendPaymentReminders,
                                            autoNotifyOnContribution = rules.autoNotifyOnContribution,
                                            allowPartialPayments = rules.allowPartialPayments,
                                            requireReceiptForExpenses = rules.requireReceiptForExpenses,
                                            requireOrganiserApproval = rules.requireOrganiserApproval,
                                        )
                                        showSettingsSheet = true
                                    } else {
                                        detailState = detailState.copy(
                                            error = detail.exceptionOrNull()?.message ?: "Failed to load group settings",
                                        )
                                    }
                                }
                            }
                            MomentraContext.Business -> {
                                scope.launch {
                                    val detail = authRepository.businessMomentDetail(moment.id)
                                    if (detail.isSuccess) {
                                        refreshBusinessCatalog(moment.id)
                                        val b = detail.getOrNull()
                                        val allocations = b?.categories.orEmpty().map { c ->
                                            BusinessCategoryAllocInput(
                                                categoryId = c.categoryId,
                                                categoryName = c.name,
                                                amountInput = c.allocatedAmount.toString(),
                                            )
                                        }
                                        businessSettingsState = BusinessMomentSettingsState(
                                            budgetName = b?.budgetName ?: moment.title,
                                            totalBudgetInput = (b?.totalBudget ?: moment.targetAmount)?.toString().orEmpty(),
                                            budgetPeriod = b?.budgetPeriod.orEmpty(),
                                            department = b?.department.orEmpty(),
                                            approvalThresholdInput = b?.approvalThreshold?.toString().orEmpty(),
                                            weeklyDigest = b?.reminderPrefs?.weeklyDigest ?: true,
                                            pendingApprovalAlerts = b?.reminderPrefs?.pendingApprovalAlerts ?: true,
                                            reminderOverBudgetAlerts = b?.reminderPrefs?.overBudgetAlerts ?: true,
                                            periodCloseReminder = b?.reminderPrefs?.periodCloseReminder ?: true,
                                            categoryAllocations = allocations,
                                        )
                                        showSettingsSheet = true
                                    } else {
                                        detailState = detailState.copy(
                                            error = detail.exceptionOrNull()?.message ?: "Failed to load business settings",
                                        )
                                    }
                                }
                            }
                            MomentraContext.Circle -> Unit
                        }
                    },
                )
            } else if (dataState.loading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = contextTheme.accent)
                }
            } else {
                dataState.error?.let { message ->
                    EmptyStateCard(
                        title = "Could not load ${selectedContext.displayName} moments",
                        subtitle = message,
                        cta = "Try again",
                        templates = emptyTemplates,
                        accent = contextActionStyle.gradientStart,
                        accentEnd = contextActionStyle.gradientEnd,
                        contextLabel = selectedContext.displayName.uppercase(),
                        onPrimaryCta = { scope.launch { reloadMoments() } },
                        onTemplateRow = { row ->
                            when (row) {
                                is HomeEmptyTemplate.WithPreset -> {
                                    createMomentPreset = row.preset
                                    createSheetKey++
                                    showCreateMomentSheet = true
                                }
                                is HomeEmptyTemplate.WithGroupPreset -> {
                                    createGroupPreset = row.preset
                                    createGroupSheetKey++
                                    showCreateGroupMomentSheet = true
                                }
                                is HomeEmptyTemplate.WithBusinessPreset -> {
                                    createBusinessPreset = row.preset
                                    createBusinessSheetKey++
                                    showCreateBusinessMomentSheet = true
                                }
                                is HomeEmptyTemplate.Simple -> Unit
                            }
                        },
                    )
                } ?: run {
                    val items = when (selectedContext) {
                        MomentraContext.Personal -> dataState.personalItems
                        MomentraContext.Group -> dataState.groupItems
                        MomentraContext.Business -> dataState.businessItems
                        MomentraContext.Circle -> emptyList()
                    }
                    if (selectedContext == MomentraContext.Circle) {
                        EmptyStateCard(
                            title = "Circle is coming soon",
                            subtitle = "This space is being prepared for social discovery moments.",
                            cta = "Stay tuned",
                            templates = emptyTemplates,
                            accent = contextActionStyle.gradientStart,
                            accentEnd = contextActionStyle.gradientEnd,
                            contextLabel = selectedContext.displayName.uppercase(),
                            onPrimaryCta = {},
                            onTemplateRow = {},
                        )
                    } else if (items.isEmpty()) {
                        val amountLine = "No active moments found yet."
                        EmptyStateCard(
                            title = "Create your first ${selectedContext.displayName.lowercase()} moment",
                            subtitle = amountLine,
                            cta = "Use a starter plan",
                            templates = emptyTemplates,
                            accent = contextActionStyle.gradientStart,
                            accentEnd = contextActionStyle.gradientEnd,
                            contextLabel = selectedContext.displayName.uppercase(),
                            onPrimaryCta = {
                                when (selectedContext) {
                                    MomentraContext.Personal -> {
                                        createMomentPreset = null
                                        createSheetKey++
                                        showCreateMomentSheet = true
                                    }
                                    MomentraContext.Group -> {
                                        createGroupPreset = null
                                        createGroupSheetKey++
                                        showCreateGroupMomentSheet = true
                                    }
                                    MomentraContext.Business -> {
                                        createBusinessPreset = null
                                        createBusinessSheetKey++
                                        showCreateBusinessMomentSheet = true
                                    }
                                    else -> Unit
                                }
                            },
                            onTemplateRow = { row ->
                                when (row) {
                                    is HomeEmptyTemplate.WithPreset -> {
                                        createMomentPreset = row.preset
                                        createSheetKey++
                                        showCreateMomentSheet = true
                                    }
                                    is HomeEmptyTemplate.WithGroupPreset -> {
                                        createGroupPreset = row.preset
                                        createGroupSheetKey++
                                        showCreateGroupMomentSheet = true
                                    }
                                    is HomeEmptyTemplate.WithBusinessPreset -> {
                                        createBusinessPreset = row.preset
                                        createBusinessSheetKey++
                                        showCreateBusinessMomentSheet = true
                                    }
                                    is HomeEmptyTemplate.Simple -> Unit
                                }
                            },
                        )
                    } else {
                        Column(modifier = Modifier.padding(top = 20.dp)) {
                            items.forEach { item ->
                                Box(
                                    modifier = Modifier
                                        .padding(bottom = 10.dp)
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(contextTheme.surface)
                                        .clickable { selectedMoment = item }
                                        .padding(14.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                item.title,
                                                color = DesignTokens.base.onDark,
                                                fontSize = 15.sp,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                            if (item.context == MomentraContext.Personal && item.durationType != null) {
                                                Text(
                                                    personalRhythmLabel(item.durationType, item.endDate),
                                                    style = DesignTokens.type.micro,
                                                    color = DesignTokens.base.onDark40,
                                                    modifier = Modifier.padding(top = 4.dp),
                                                )
                                            }
                                            if (item.context == MomentraContext.Group && item.splitMode != null) {
                                                Text(
                                                    groupSplitLabel(item.splitMode),
                                                    style = DesignTokens.type.micro,
                                                    color = DesignTokens.base.onDark40,
                                                    modifier = Modifier.padding(top = 4.dp),
                                                )
                                            }
                                            if (item.context == MomentraContext.Business && item.businessPendingApprovalsCount > 0) {
                                                MomentraStatusBadge(
                                                    label = "Pending approvals: ${item.businessPendingApprovalsCount}",
                                                    background = DesignTokens.base.s200,
                                                    textColor = contextTheme.accent,
                                                    modifier = Modifier.padding(top = 6.dp),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        when {
            selectedContext == MomentraContext.Personal && selectedMoment == null -> {
                MomentraPrimaryButton(
                    label = "New goal",
                    onClick = {
                        createMomentPreset = null
                        createSheetKey++
                        showCreateMomentSheet = true
                    },
                    actionStyle = contextActionStyle,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp),
                )
            }
            selectedContext == MomentraContext.Group && selectedMoment == null -> {
                MomentraPrimaryButton(
                    label = "New group",
                    onClick = {
                        createGroupPreset = null
                        createGroupSheetKey++
                        showCreateGroupMomentSheet = true
                    },
                    actionStyle = contextActionStyle,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp),
                )
            }
            selectedContext == MomentraContext.Business && selectedMoment == null -> {
                MomentraPrimaryButton(
                    label = "New budget",
                    onClick = {
                        createBusinessPreset = null
                        createBusinessSheetKey++
                        showCreateBusinessMomentSheet = true
                    },
                    actionStyle = contextActionStyle,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp),
                )
            }
            selectedMoment?.context == MomentraContext.Personal -> {
                MomentraPrimaryButton(
                    label = "Add to My Fund",
                    onClick = {
                        editingTxnSnapshot = null
                        formState = PersonalTxnFormState(
                            isIncome = false,
                            txnDateInput = calendarDateIso(),
                        )
                        showTxnSheet = true
                    },
                    actionStyle = selectedActionStyle,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp),
                )
            }
            selectedMoment?.context == MomentraContext.Group -> {
                MomentraPrimaryButton(
                    label = "Add expense",
                    onClick = {
                        groupExpenseSheetKey++
                        showGroupExpenseSheet = true
                    },
                    actionStyle = selectedActionStyle,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp),
                )
            }
            selectedMoment?.context == MomentraContext.Business -> {
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(18.dp),
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (detailState.businessCanInviteMembers) {
                        MomentraPrimaryButton(
                            label = "Invite team",
                            onClick = {
                                businessMemberSheetKey++
                                showBusinessMemberSheet = true
                            },
                            actionStyle = selectedActionStyle,
                        )
                    }
                    MomentraPrimaryButton(
                        label = "Add expense",
                        onClick = {
                            businessExpenseKind = "expense"
                            businessExpenseSheetKey++
                            showBusinessExpenseSheet = true
                        },
                        actionStyle = selectedActionStyle,
                    )
                    MomentraPrimaryButton(
                        label = "Add purchase",
                        onClick = {
                            businessExpenseKind = "purchase"
                            businessExpenseSheetKey++
                            showBusinessExpenseSheet = true
                        },
                        actionStyle = selectedActionStyle,
                    )
                }
            }
        }
    }

    if (showCreateMomentSheet && selectedContext == MomentraContext.Personal) {
        PersonalCreateMomentSheet(
            contextAccent = contextTheme.accent,
            accentEnd = contextTheme.accentEnd,
            preset = createMomentPreset,
            sheetKey = createSheetKey,
            isSubmitting = createMomentSubmitting,
            onDismiss = {
                if (!createMomentSubmitting) {
                    showCreateMomentSheet = false
                    createMomentPreset = null
                }
            },
            onSubmit = { body ->
                scope.launch {
                    createMomentSubmitting = true
                    val r = authRepository.createPersonalMoment(body)
                    createMomentSubmitting = false
                    if (r.isSuccess) {
                        val id = r.getOrNull()?.momentId ?: return@launch
                        showCreateMomentSheet = false
                        createMomentPreset = null
                        reloadMoments()
                        selectedMoment = dataState.personalItems.firstOrNull { it.id == id }
                    }
                }
            },
        )
    }

    if (showCreateGroupMomentSheet && selectedContext == MomentraContext.Group) {
        GroupCreateMomentSheet(
            contextAccent = contextTheme.accent,
            accentEnd = contextTheme.accentEnd,
            preset = createGroupPreset,
            sheetKey = createGroupSheetKey,
            isSubmitting = createGroupMomentSubmitting,
            onDismiss = {
                if (!createGroupMomentSubmitting) {
                    showCreateGroupMomentSheet = false
                    createGroupPreset = null
                }
            },
            onSubmit = { body ->
                scope.launch {
                    createGroupMomentSubmitting = true
                    val r = authRepository.createGroupMoment(body)
                    createGroupMomentSubmitting = false
                    if (r.isSuccess) {
                        val id = r.getOrNull()?.momentId ?: return@launch
                        showCreateGroupMomentSheet = false
                        createGroupPreset = null
                        reloadMoments()
                        selectedMoment = dataState.groupItems.firstOrNull { it.id == id }
                    }
                }
            },
        )
    }

    if (showCreateBusinessMomentSheet && selectedContext == MomentraContext.Business) {
        BusinessCreateMomentSheet(
            contextAccent = contextTheme.accent,
            accentEnd = contextTheme.accentEnd,
            preset = createBusinessPreset,
            sheetKey = createBusinessSheetKey,
            isSubmitting = createBusinessMomentSubmitting,
            onDismiss = {
                if (!createBusinessMomentSubmitting) {
                    showCreateBusinessMomentSheet = false
                    createBusinessPreset = null
                }
            },
            onSubmit = { body: BusinessBudgetCreateIn ->
                scope.launch {
                    createBusinessMomentSubmitting = true
                    val r = authRepository.createBusinessMoment(body)
                    createBusinessMomentSubmitting = false
                    if (r.isSuccess) {
                        val id = r.getOrNull()?.budgetId ?: return@launch
                        showCreateBusinessMomentSheet = false
                        createBusinessPreset = null
                        reloadMoments()
                        selectedMoment = dataState.businessItems.firstOrNull { it.id == id }
                    }
                }
            },
        )
    }

    if (showGroupExpenseSheet && selectedMoment?.context == MomentraContext.Group) {
        val gid = selectedMoment?.id.orEmpty()
        GroupExpenseSheet(
            contextAccent = contextTheme.accent,
            sheetKey = groupExpenseSheetKey,
            categories = detailState.groupCategoriesForPicker,
            members = detailState.groupMembersForPicker,
            defaultPaidByMemberId = detailState.groupDefaultPaidByMemberId,
            defaultCategoryKey = detailState.groupDefaultCategoryKey,
            isSubmitting = groupExpenseSubmitting,
            onDismiss = {
                if (!groupExpenseSubmitting) {
                    showGroupExpenseSheet = false
                }
            },
            onSubmit = { body ->
                scope.launch {
                    groupExpenseSubmitting = true
                    val r = authRepository.createGroupExpense(gid, body)
                    groupExpenseSubmitting = false
                    if (r.isSuccess) {
                        val detail = r.getOrNull() ?: return@launch
                        showGroupExpenseSheet = false
                        detailState = buildGroupDetailState(
                            detail,
                            selectedMoment?.title.orEmpty(),
                            authRepository.currentUser?.uid,
                        )
                        refreshGroupMoments()
                        selectedMoment = dataState.groupItems.firstOrNull { it.id == gid }
                    }
                }
            },
        )
    }

    if (showBusinessMemberSheet && selectedMoment?.context == MomentraContext.Business) {
        val budgetId = selectedMoment?.id.orEmpty()
        BusinessInviteMemberSheet(
            contextAccent = contextTheme.accent,
            sheetKey = businessMemberSheetKey,
            isSubmitting = businessMemberSubmitting,
            onDismiss = {
                if (!businessMemberSubmitting) {
                    showBusinessMemberSheet = false
                }
            },
            onSubmit = { body ->
                scope.launch {
                    businessMemberSubmitting = true
                    val r = authRepository.addBusinessBudgetMember(budgetId, body)
                    businessMemberSubmitting = false
                    if (r.isSuccess) {
                        showBusinessMemberSheet = false
                        val detail = authRepository.businessMomentDetail(budgetId)
                        if (detail.isSuccess) {
                            refreshBusinessCatalog(budgetId)
                            detailState = buildBusinessDetailState(detail.getOrNull(), selectedMoment?.title.orEmpty())
                        }
                        refreshBusinessMoments()
                    }
                }
            },
        )
    }

    if (showBusinessExpenseSheet && selectedMoment?.context == MomentraContext.Business) {
        val budgetId = selectedMoment?.id.orEmpty()
        BusinessExpenseSheet(
            contextAccent = contextTheme.accent,
            sheetKey = businessExpenseSheetKey,
            isSubmitting = businessExpenseSubmitting,
            defaultKind = businessExpenseKind,
            categories = detailState.businessCategoriesForPicker,
            catalog = businessCatalog,
            vendorOptions = detailState.businessVendorNames,
            vendorRecords = detailState.businessVendorRecords,
            onAddVendor = { vendorName ->
                val result = authRepository.createBusinessVendor(
                    budgetId = budgetId,
                    body = BusinessVendorCreateIn(vendorName = vendorName),
                )
                if (result.isSuccess) {
                    detailState = buildBusinessDetailState(result.getOrNull(), selectedMoment?.title.orEmpty())
                    true
                } else {
                    false
                }
            },
            onRenameVendor = { vendorId, vendorName ->
                val result = authRepository.patchBusinessVendor(
                    budgetId = budgetId,
                    vendorId = vendorId,
                    body = BusinessVendorPatchIn(vendorName = vendorName),
                )
                if (result.isSuccess) {
                    detailState = buildBusinessDetailState(result.getOrNull(), selectedMoment?.title.orEmpty())
                    true
                } else {
                    false
                }
            },
            onDeleteVendor = { vendorId ->
                val result = authRepository.deleteBusinessVendor(
                    budgetId = budgetId,
                    vendorId = vendorId,
                )
                if (result.isSuccess) {
                    detailState = buildBusinessDetailState(result.getOrNull(), selectedMoment?.title.orEmpty())
                    true
                } else {
                    false
                }
            },
            onDismiss = {
                if (!businessExpenseSubmitting) {
                    showBusinessExpenseSheet = false
                }
            },
            onSubmit = { body, receipt ->
                scope.launch {
                    businessExpenseSubmitting = true
                    val r = authRepository.createBusinessExpense(budgetId, body)
                    if (r.isSuccess) {
                        val out = r.getOrNull()
                        if (receipt != null) {
                            val approvalId = out?.pendingApprovals?.firstOrNull()?.approvalId
                                ?: out?.recentApprovals?.firstOrNull()?.approvalId
                                ?: out?.mySubmissions?.firstOrNull()?.approvalId
                            if (!approvalId.isNullOrBlank()) {
                                authRepository.uploadBusinessReceipt(
                                    budgetId = budgetId,
                                    approvalId = approvalId,
                                    file = receipt.file,
                                    mimeType = receipt.mimeType,
                                )
                            }
                        }
                        businessExpenseSubmitting = false
                        showBusinessExpenseSheet = false
                        val updated = out?.let { mapBusinessMoment(it) }
                        if (updated != null) selectedMoment = updated
                        refreshBusinessMoments()
                        val detail = authRepository.businessMomentDetail(budgetId)
                        if (detail.isSuccess) {
                            refreshBusinessCatalog(budgetId)
                            detailState = buildBusinessDetailState(detail.getOrNull(), selectedMoment?.title.orEmpty())
                        }
                    } else {
                        businessExpenseSubmitting = false
                        val apiError = readableApiError(r.exceptionOrNull())
                        Toast.makeText(appContext, apiError, Toast.LENGTH_LONG).show()
                    }
                }
            },
        )
    }

    if (showGroupInviteSheet && selectedMoment?.context == MomentraContext.Group) {
        GroupInviteSheet(
            contextAccent = contextTheme.accent,
            joinUrl = detailState.groupJoinUrl.orEmpty(),
            sheetKey = groupInviteSheetKey,
            isSendingEmail = groupEmailSending,
            emailResultMessage = groupEmailResultMessage,
            onDismiss = {
                if (!groupEmailSending) {
                    showGroupInviteSheet = false
                    groupEmailResultMessage = null
                }
            },
            onSendEmail = { payload ->
                scope.launch {
                    val momentId = selectedMoment?.id ?: return@launch
                    groupEmailSending = true
                    groupEmailResultMessage = null
                    val r = authRepository.sendGroupInviteEmails(momentId, payload)
                    groupEmailSending = false
                    if (r.isSuccess) {
                        val o = r.getOrNull()
                        val base = "Sent ${o?.sent ?: 0}, failed ${o?.failed ?: 0} (total ${o?.total ?: 0})"
                        val details = o?.errorMessages.orEmpty().filter { it.isNotBlank() }
                        groupEmailResultMessage = if (details.isEmpty()) {
                            base
                        } else {
                            "$base\n${details.joinToString("\n")}"
                        }
                    } else {
                        groupEmailResultMessage = r.exceptionOrNull()?.message ?: "Failed to send"
                    }
                }
            },
        )
    }

    if (showBusinessInviteSheet && selectedMoment?.context == MomentraContext.Business) {
        BusinessInviteSheet(
            contextAccent = contextTheme.accent,
            joinUrl = businessShareJoinUrl.orEmpty(),
            sheetKey = businessInviteSheetKey,
            isSendingEmail = businessEmailSending,
            emailResultMessage = businessEmailResultMessage,
            onDismiss = {
                if (!businessEmailSending) {
                    showBusinessInviteSheet = false
                    businessEmailResultMessage = null
                    businessShareJoinUrl = null
                }
            },
            onSendEmail = { payload ->
                scope.launch {
                    val budgetId = selectedMoment?.id ?: return@launch
                    businessEmailSending = true
                    businessEmailResultMessage = null
                    val r = authRepository.sendBusinessInviteEmails(budgetId, payload)
                    businessEmailSending = false
                    if (r.isSuccess) {
                        val o = r.getOrNull()
                        val base = "Sent ${o?.sent ?: 0}, failed ${o?.failed ?: 0} (total ${o?.total ?: 0})"
                        val details = o?.errorMessages.orEmpty().filter { it.isNotBlank() }
                        businessEmailResultMessage = if (details.isEmpty()) {
                            base
                        } else {
                            "$base\n${details.joinToString("\n")}"
                        }
                    } else {
                        businessEmailResultMessage = r.exceptionOrNull()?.message ?: "Failed to send"
                    }
                }
            },
        )
    }

    if (showInviteQrScanner) {
        InviteQrScannerDialog(
            onDismiss = { showInviteQrScanner = false },
            onBarcode = { raw ->
                scope.launch {
                    val parsed = parseInvitePayload(raw)
                    if (parsed == null) {
                        Toast.makeText(appContext, "Not a Momentra invite QR", Toast.LENGTH_LONG).show()
                        return@launch
                    }
                    val result = when (parsed.kind) {
                        InviteLinkKind.BUSINESS -> authRepository.joinBusinessWithToken(parsed.token)
                        InviteLinkKind.GROUP -> authRepository.joinGroupWithToken(parsed.token)
                    }
                    showInviteQrScanner = false
                    if (result.isSuccess) {
                        Toast.makeText(appContext, "You're in!", Toast.LENGTH_SHORT).show()
                        selectedContext = when (parsed.kind) {
                            InviteLinkKind.BUSINESS -> MomentraContext.Business
                            InviteLinkKind.GROUP -> MomentraContext.Group
                        }
                        reloadMoments()
                        when (parsed.kind) {
                            InviteLinkKind.BUSINESS -> {
                                businessPendingInvites = authRepository.businessPendingInvites().getOrNull()?.invites.orEmpty()
                            }
                            InviteLinkKind.GROUP -> {
                                groupPendingInvites = authRepository.groupPendingInvites().getOrNull()?.invites.orEmpty()
                            }
                        }
                    } else {
                        Toast.makeText(
                            appContext,
                            result.exceptionOrNull()?.message ?: "Could not join",
                            Toast.LENGTH_LONG,
                        ).show()
                    }
                }
            },
        )
    }

    if (showTxnSheet && selectedMoment?.context == MomentraContext.Personal) {
        PersonalTransactionSheet(
            contextAccent = contextTheme.accent,
            formState = formState,
            categories = categoryOptions,
            isEditing = formState.editingTransactionId != null,
            onDismiss = {
                showTxnSheet = false
                editingTxnSnapshot = null
            },
            onRequestDelete = { showDeleteTxnAlert = true },
            onFormChange = { formState = it },
            onSubmit = {
                val moment = selectedMoment ?: return@PersonalTransactionSheet
                val selectedCategory = categoryOptions.firstOrNull { it.categoryId == formState.selectedCategoryId }
                val amount = formState.amountInput.toDoubleOrNull()
                val dateTrim = formState.txnDateInput.trim()
                if (dateTrim.isNotEmpty() && !dateTrim.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
                    formState = formState.copy(error = "Date: use YYYY-MM-DD")
                    return@PersonalTransactionSheet
                }
                if (selectedCategory == null || amount == null || amount <= 0.0) {
                    formState = formState.copy(error = "Select category and enter valid amount")
                    return@PersonalTransactionSheet
                }
                scope.launch {
                    formState = formState.copy(loading = true, error = null)
                    val editId = formState.editingTransactionId
                    val result = if (editId != null) {
                        authRepository.patchPersonalTransaction(
                            transactionId = editId,
                            body = PersonalTransactionPatchIn(
                                isIncome = formState.isIncome,
                                amount = amount,
                                category = selectedCategory.name,
                                subcategoryId = formState.selectedSubcategoryId,
                                title = formState.titleInput.ifBlank { null },
                                note = formState.noteInput.ifBlank { null },
                                txnDate = dateTrim.ifBlank { null },
                            ),
                        )
                    } else {
                        authRepository.createPersonalTransaction(
                            PersonalTransactionCreateIn(
                                isIncome = formState.isIncome,
                                amount = amount,
                                category = selectedCategory.name,
                                subcategoryId = formState.selectedSubcategoryId,
                                title = formState.titleInput.takeIf { it.isNotBlank() },
                                note = formState.noteInput.takeIf { it.isNotBlank() },
                                txnDate = dateTrim.ifBlank { null },
                            ),
                        )
                    }
                    if (result.isSuccess) {
                        showTxnSheet = false
                        editingTxnSnapshot = null
                        formState = PersonalTxnFormState()
                        refreshPersonalDetail(moment)
                    } else {
                        formState = formState.copy(
                            loading = false,
                            error = result.exceptionOrNull()?.message
                                ?: "Failed to save transaction",
                        )
                    }
                }
            },
        )
    }

    if (showDeleteTxnAlert && formState.editingTransactionId != null && selectedMoment?.context == MomentraContext.Personal) {
        AlertDialog(
            onDismissRequest = { if (!formState.loading) showDeleteTxnAlert = false },
            title = { Text("Delete transaction", color = DesignTokens.base.onDark) },
            text = { Text("This removes the transaction from your history.", color = DesignTokens.base.brandText) },
            confirmButton = {
                TextButton(
                    onClick = {
                        val moment = selectedMoment ?: return@TextButton
                        val tid = formState.editingTransactionId ?: return@TextButton
                        scope.launch {
                            formState = formState.copy(loading = true, error = null)
                            val r = authRepository.deletePersonalTransaction(tid)
                            if (r.isSuccess) {
                                showDeleteTxnAlert = false
                                showTxnSheet = false
                                editingTxnSnapshot = null
                                formState = PersonalTxnFormState()
                                refreshPersonalDetail(moment)
                            } else {
                                formState = formState.copy(
                                    loading = false,
                                    error = r.exceptionOrNull()?.message ?: "Failed to delete",
                                )
                                showDeleteTxnAlert = false
                            }
                        }
                    },
                ) {
                    Text("Delete", color = DesignTokens.urgency.high)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteTxnAlert = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
            containerColor = DesignTokens.base.s100,
        )
    }

    if (showSettingsSheet && selectedMoment != null) {
        when (selectedMoment?.context) {
            MomentraContext.Personal -> PersonalMomentSettingsSheet(
                contextAccent = contextTheme.accent,
                state = personalSettingsState,
                onDismiss = {
                    if (!personalSettingsState.loading) {
                        showSettingsSheet = false
                        showDeleteConfirm = false
                    }
                },
                onChange = { personalSettingsState = it },
                onDelete = { showDeleteConfirm = true },
                onSave = {
                    val moment = selectedMoment ?: return@PersonalMomentSettingsSheet
                    val targetAmount = personalSettingsState.targetAmountInput.trim().toDoubleOrNull()
                    if (personalSettingsState.targetAmountInput.isNotBlank() && targetAmount == null) {
                        personalSettingsState = personalSettingsState.copy(error = "Target amount must be a valid number")
                        return@PersonalMomentSettingsSheet
                    }
                    scope.launch {
                        personalSettingsState = personalSettingsState.copy(loading = true, error = null)
                        val result = authRepository.patchPersonalMoment(
                            momentId = moment.id,
                            body = PersonalMomentPatchIn(
                                title = personalSettingsState.title.trim().ifBlank { null },
                                targetAmount = targetAmount,
                                durationType = if (personalSettingsState.rhythmMonthly) {
                                    PersonalMomentDuration.RECURRING_MONTHLY
                                } else {
                                    PersonalMomentDuration.FIXED_END
                                },
                                startDate = personalSettingsState.startDateInput.trim().ifBlank { null },
                                endDate = if (personalSettingsState.rhythmMonthly) {
                                    null
                                } else {
                                    personalSettingsState.endDateInput.trim().ifBlank { null }
                                },
                                description = personalSettingsState.description.trim().ifBlank { null },
                                savingMode = personalSettingsState.savingMode.trim().ifBlank { null },
                                isPrivateMoment = personalSettingsState.isPrivateMoment,
                            ),
                        )
                        if (result.isSuccess) {
                            val updated = result.getOrNull()?.let { mapPersonalMoment(it) } ?: moment
                            refreshPersonalMoments()
                            selectedMoment = updated
                            refreshPersonalDetail(updated)
                            personalSettingsState = personalSettingsState.copy(loading = false, error = null)
                            showSettingsSheet = false
                        } else {
                            personalSettingsState = personalSettingsState.copy(
                                loading = false,
                                error = result.exceptionOrNull()?.message ?: "Failed to update moment",
                            )
                        }
                    }
                },
            )
            MomentraContext.Group -> GroupMomentSettingsSheet(
                contextAccent = contextTheme.accent,
                state = groupSettingsState,
                onDismiss = {
                    if (!groupSettingsState.loading) {
                        showSettingsSheet = false
                        showDeleteConfirm = false
                    }
                },
                onChange = { groupSettingsState = it },
                onDelete = { showDeleteConfirm = true },
                onSave = {
                    val moment = selectedMoment ?: return@GroupMomentSettingsSheet
                    val targetAmount = groupSettingsState.targetAmountInput.trim().toDoubleOrNull()
                    if (groupSettingsState.targetAmountInput.isNotBlank() && targetAmount == null) {
                        groupSettingsState = groupSettingsState.copy(error = "Target amount must be a valid number")
                        return@GroupMomentSettingsSheet
                    }
                    scope.launch {
                        groupSettingsState = groupSettingsState.copy(loading = true, error = null)
                        val result = authRepository.patchGroupMoment(
                            momentId = moment.id,
                            body = GroupMomentPatchIn(
                                title = groupSettingsState.title.trim().ifBlank { null },
                                targetAmount = targetAmount,
                                destination = groupSettingsState.destination.trim().ifBlank { null },
                                contributionDueDate = groupSettingsState.contributionDueDate.trim().ifBlank { null },
                                rules = GroupMomentRulesIn(
                                    sendPaymentReminders = groupSettingsState.sendPaymentReminders,
                                    autoNotifyOnContribution = groupSettingsState.autoNotifyOnContribution,
                                    allowPartialPayments = groupSettingsState.allowPartialPayments,
                                    requireReceiptForExpenses = groupSettingsState.requireReceiptForExpenses,
                                    requireOrganiserApproval = groupSettingsState.requireOrganiserApproval,
                                ),
                                status = groupSettingsState.status.trim().ifBlank { null },
                            ),
                        )
                        if (result.isSuccess) {
                            val updated = result.getOrNull()?.moment?.let { mapGroupMoment(it) } ?: moment
                            refreshGroupMoments()
                            selectedMoment = updated
                            val full = authRepository.groupMomentDetail(moment.id).getOrNull()
                            if (full != null) {
                                detailState = buildGroupDetailState(full, updated.title, authRepository.currentUser?.uid)
                            } else {
                                detailState = detailState.copy(error = null)
                            }
                            groupSettingsState = groupSettingsState.copy(loading = false, error = null)
                            showSettingsSheet = false
                        } else {
                            groupSettingsState = groupSettingsState.copy(
                                loading = false,
                                error = result.exceptionOrNull()?.message ?: "Failed to update group moment",
                            )
                        }
                    }
                },
            )
            MomentraContext.Business -> BusinessMomentSettingsSheet(
                contextAccent = contextTheme.accent,
                state = businessSettingsState,
                onDismiss = {
                    if (!businessSettingsState.loading) {
                        showSettingsSheet = false
                        showDeleteConfirm = false
                    }
                },
                onChange = { businessSettingsState = it },
                onDelete = { showDeleteConfirm = true },
                onSave = {
                    val moment = selectedMoment ?: return@BusinessMomentSettingsSheet
                    val totalBudget = businessSettingsState.totalBudgetInput.trim().toDoubleOrNull()
                    val threshold = businessSettingsState.approvalThresholdInput.trim().toDoubleOrNull()
                    if (businessSettingsState.totalBudgetInput.isNotBlank() && totalBudget == null) {
                        businessSettingsState = businessSettingsState.copy(error = "Total budget must be a valid number")
                        return@BusinessMomentSettingsSheet
                    }
                    if (businessSettingsState.approvalThresholdInput.isNotBlank() && threshold == null) {
                        businessSettingsState = businessSettingsState.copy(error = "Approval threshold must be a valid number")
                        return@BusinessMomentSettingsSheet
                    }
                    val categoryPatch = businessSettingsState.categoryAllocations.mapNotNull { item ->
                        val amount = item.amountInput.trim().toDoubleOrNull() ?: return@mapNotNull null
                        BusinessBudgetCategoryAllocPatchIn(categoryId = item.categoryId, allocatedAmount = amount)
                    }
                    if (businessSettingsState.categoryAllocations.isNotEmpty() && categoryPatch.size != businessSettingsState.categoryAllocations.size) {
                        businessSettingsState = businessSettingsState.copy(error = "All category allocations must be valid numbers")
                        return@BusinessMomentSettingsSheet
                    }
                    scope.launch {
                        businessSettingsState = businessSettingsState.copy(loading = true, error = null)
                        val result = authRepository.patchBusinessBudget(
                            budgetId = moment.id,
                            body = BusinessBudgetPatchIn(
                                budgetName = businessSettingsState.budgetName.trim().ifBlank { null },
                                budgetPeriod = businessSettingsState.budgetPeriod.trim().ifBlank { null },
                                totalBudget = totalBudget,
                                department = businessSettingsState.department.trim().ifBlank { null },
                                approvalThreshold = threshold,
                                spendingPolicies = BusinessBudgetPoliciesIn(
                                    requireReceiptForAllExpenses = businessSettingsState.requireReceiptForAllExpenses,
                                    autoApproveBelowThreshold = businessSettingsState.autoApproveBelowThreshold,
                                    managerApprovalRequired = businessSettingsState.managerApprovalRequired,
                                    notifyAdminOnSubmission = businessSettingsState.notifyAdminOnSubmission,
                                    overBudgetAlerts = businessSettingsState.overBudgetAlerts,
                                    lockBudgetWhenLimitHit = businessSettingsState.lockBudgetWhenLimitHit,
                                ),
                                reminderPrefs = BusinessBudgetReminderPrefsPatchIn(
                                    weeklyDigest = businessSettingsState.weeklyDigest,
                                    pendingApprovalAlerts = businessSettingsState.pendingApprovalAlerts,
                                    overBudgetAlerts = businessSettingsState.reminderOverBudgetAlerts,
                                    periodCloseReminder = businessSettingsState.periodCloseReminder,
                                ),
                                categories = categoryPatch,
                            ),
                        )
                        if (result.isSuccess) {
                            val updated = result.getOrNull()?.let { mapBusinessMoment(it) } ?: moment
                            refreshBusinessMoments()
                            selectedMoment = updated
                            detailState = detailState.copy(error = null)
                            businessSettingsState = businessSettingsState.copy(loading = false, error = null)
                            showSettingsSheet = false
                        } else {
                            businessSettingsState = businessSettingsState.copy(
                                loading = false,
                                error = result.exceptionOrNull()?.message ?: "Failed to update business moment",
                            )
                        }
                    }
                },
            )
            MomentraContext.Circle, null -> Unit
        }
    }

    if (showDeleteConfirm && selectedMoment != null) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete moment", color = DesignTokens.base.onDark) },
            text = { Text("This action cannot be undone.", color = DesignTokens.base.brandText) },
            confirmButton = {
                TextButton(
                    onClick = {
                        val moment = selectedMoment ?: return@TextButton
                        scope.launch {
                            when (moment.context) {
                                MomentraContext.Personal -> personalSettingsState = personalSettingsState.copy(loading = true, error = null)
                                MomentraContext.Group -> groupSettingsState = groupSettingsState.copy(loading = true, error = null)
                                MomentraContext.Business -> businessSettingsState = businessSettingsState.copy(loading = true, error = null)
                                MomentraContext.Circle -> Unit
                            }
                            val result = when (moment.context) {
                                MomentraContext.Personal -> authRepository.deletePersonalMoment(moment.id)
                                MomentraContext.Group -> authRepository.deleteGroupMoment(moment.id)
                                MomentraContext.Business -> authRepository.deleteBusinessBudget(moment.id)
                                MomentraContext.Circle -> Result.success(Unit)
                            }
                            if (result.isSuccess) {
                                when (moment.context) {
                                    MomentraContext.Personal -> refreshPersonalMoments()
                                    MomentraContext.Group -> refreshGroupMoments()
                                    MomentraContext.Business -> refreshBusinessMoments()
                                    MomentraContext.Circle -> Unit
                                }
                                selectedMoment = null
                                detailState = DetailState()
                                showDeleteConfirm = false
                                showSettingsSheet = false
                                personalSettingsState = PersonalMomentSettingsState()
                                groupSettingsState = GroupMomentSettingsState()
                                businessSettingsState = BusinessMomentSettingsState()
                            } else {
                                showDeleteConfirm = false
                                val err = result.exceptionOrNull()?.message ?: "Failed to delete moment"
                                when (moment.context) {
                                    MomentraContext.Personal -> personalSettingsState = personalSettingsState.copy(loading = false, error = err)
                                    MomentraContext.Group -> groupSettingsState = groupSettingsState.copy(loading = false, error = err)
                                    MomentraContext.Business -> businessSettingsState = businessSettingsState.copy(loading = false, error = err)
                                    MomentraContext.Circle -> Unit
                                }
                            }
                        }
                    },
                ) {
                    Text("Delete", color = DesignTokens.urgency.high)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel", color = DesignTokens.base.brandText)
                }
            },
            containerColor = DesignTokens.base.s100,
        )
    }
}

@Composable
private fun MomentDetailsView(
    detailState: DetailState,
    accent: Color,
    isPersonal: Boolean,
    isGroup: Boolean = false,
    isBusiness: Boolean = false,
    onBack: () -> Unit,
    onOpenSettings: () -> Unit,
    onAddGroupExpense: () -> Unit = {},
    onInviteGroupPeople: () -> Unit = {},
    onInviteBusinessShare: () -> Unit = {},
    onAddBusinessExpense: () -> Unit = {},
    onAddBusinessPurchase: () -> Unit = {},
    businessApprovalSubmittingId: String? = null,
    onApproveBusinessApproval: (String) -> Unit = {},
    onRejectBusinessApproval: (String) -> Unit = {},
    onTransactionTap: (PersonalTxnItem) -> Unit,
) {
    Column(
        modifier = Modifier
            .padding(top = 20.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(DesignTokens.base.s100)
            .padding(16.dp),
    ) {
        TextButton(onClick = onBack) {
            Text("Back", color = accent)
        }
        Text(
            text = detailState.title.ifBlank { "Moment details" },
            color = DesignTokens.base.onDark,
            fontSize = 19.sp,
            fontWeight = FontWeight.Bold,
        )
        when {
            detailState.loading -> {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = accent)
                }
            }
            detailState.error != null -> {
                Text(
                    text = detailState.error,
                    color = DesignTokens.base.brandText,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            else -> {
                detailState.lines.forEach { (label, value) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(label, color = DesignTokens.base.brandText, fontSize = 13.sp)
                        Text(value, color = DesignTokens.base.onDark, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }
                }
                if (!isPersonal && !isGroup && detailState.businessVendorBalances.isNotEmpty()) {
                    Text(
                        text = "Vendor outstanding",
                        color = DesignTokens.base.onDark,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 14.dp),
                    )
                    detailState.businessVendorBalances.forEach { row ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(DesignTokens.base.s200)
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                        ) {
                            Text(row.vendorName, color = DesignTokens.base.onDark, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Text(
                                "Total ${DesignTokens.formatInr(row.totalAmount)} · Paid ${DesignTokens.formatInr(row.paidAmount)} · Due ${DesignTokens.formatInr(row.balanceAmount)}",
                                color = DesignTokens.base.brandText,
                                fontSize = 11.sp,
                            )
                        }
                    }
                }
                if (isBusiness) {
                    Text(
                        text = "Pending approvals",
                        color = DesignTokens.base.onDark,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 14.dp),
                    )
                    if (detailState.businessPendingApprovals.isEmpty()) {
                        Text(
                            text = "No pending approvals.",
                            color = DesignTokens.base.brandText,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    } else {
                        detailState.businessPendingApprovals.forEach { approval ->
                            val shortId = approval.approvalId.take(8)
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(DesignTokens.base.s200)
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                            ) {
                                Text(
                                    "ID #$shortId · ${approval.status.replaceFirstChar { it.uppercase() }}",
                                    color = DesignTokens.base.onDark,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                )
                                Text(
                                    if (approval.receiptAttached) "Receipt attached" else "Receipt not attached",
                                    color = DesignTokens.base.brandText,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(top = 2.dp),
                                )
                                if (detailState.businessCanApproveApprovals) {
                                    Row(
                                        modifier = Modifier.padding(top = 4.dp),
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        val busy = businessApprovalSubmittingId == approval.approvalId
                                        TextButton(
                                            onClick = { onApproveBusinessApproval(approval.approvalId) },
                                            enabled = !busy,
                                        ) {
                                            if (busy) {
                                                CircularProgressIndicator(
                                                    modifier = Modifier.size(13.dp),
                                                    color = accent,
                                                    strokeWidth = 2.dp,
                                                )
                                            } else {
                                                Text("Approve", color = accent, fontSize = 12.sp)
                                            }
                                        }
                                        TextButton(
                                            onClick = { onRejectBusinessApproval(approval.approvalId) },
                                            enabled = !busy,
                                        ) {
                                            Text("Reject", color = DesignTokens.urgency.high, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (isGroup) {
                    Row(
                        modifier = Modifier.padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        TextButton(onClick = onAddGroupExpense) {
                            Text("Add expense", color = accent, fontSize = 13.sp)
                        }
                        TextButton(onClick = onInviteGroupPeople) {
                            Text("Invite people", color = accent, fontSize = 13.sp)
                        }
                    }
                }
                if (isBusiness) {
                    Row(
                        modifier = Modifier.padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        TextButton(onClick = onAddBusinessExpense) {
                            Text("Add expense", color = accent, fontSize = 13.sp)
                        }
                        TextButton(onClick = onAddBusinessPurchase) {
                            Text("Add purchase", color = accent, fontSize = 13.sp)
                        }
                        TextButton(onClick = onInviteBusinessShare) {
                            Text("Invite team", color = accent, fontSize = 13.sp)
                        }
                    }
                }
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    TextButton(onClick = onOpenSettings) {
                        Text("Moment settings", color = accent)
                    }
                }
                if (isPersonal) {
                    Text(
                        text = "Recent transactions",
                        color = DesignTokens.base.onDark,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
                    )
                    if (detailState.recentTransactions.isEmpty()) {
                        Text(
                            text = "No recent transactions yet.",
                            color = DesignTokens.base.brandText,
                            fontSize = 12.sp,
                        )
                    } else {
                        detailState.recentTransactions.forEach { txn ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(DesignTokens.base.s200)
                                    .clickable { onTransactionTap(txn) }
                                    .padding(horizontal = 10.dp, vertical = 9.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(txn.title, color = DesignTokens.base.onDark, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                    Text(txn.subtitle, color = DesignTokens.base.brandText, fontSize = 11.sp)
                                }
                                val signed = if (txn.isIncome) txn.amount else -txn.amount
                                Text(
                                    text = DesignTokens.formatInr(signed),
                                    color = if (txn.isIncome) DesignTokens.group.accentEnd else DesignTokens.urgency.high,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
                if (isGroup) {
                    Text(
                        text = "Recent expenses",
                        color = DesignTokens.base.onDark,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
                    )
                    if (detailState.groupExpenses.isEmpty()) {
                        Text(
                            text = "No expenses yet.",
                            color = DesignTokens.base.brandText,
                            fontSize = 12.sp,
                        )
                    } else {
                        detailState.groupExpenses.forEach { exp ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(DesignTokens.base.s200)
                                    .padding(horizontal = 10.dp, vertical = 9.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(exp.title, color = DesignTokens.base.onDark, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                    Text(exp.subtitle, color = DesignTokens.base.brandText, fontSize = 11.sp)
                                }
                                Text(
                                    text = DesignTokens.formatInr(exp.amount),
                                    color = DesignTokens.urgency.high,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PersonalTransactionSheet(
    contextAccent: Color,
    formState: PersonalTxnFormState,
    categories: List<PersonalCategoryOut>,
    isEditing: Boolean,
    onDismiss: () -> Unit,
    onRequestDelete: () -> Unit,
    onFormChange: (PersonalTxnFormState) -> Unit,
    onSubmit: () -> Unit,
) {
    val selectedCategory = categories.firstOrNull { it.categoryId == formState.selectedCategoryId }
    val subcategories = selectedCategory?.subcategories.orEmpty()
    var categoryExpanded by remember { mutableStateOf(false) }
    var subcategoryExpanded by remember { mutableStateOf(false) }

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
                if (isEditing) "Edit transaction" else "Add transaction",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))

            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = !formState.isIncome,
                    onClick = {
                        onFormChange(
                            formState.copy(
                                isIncome = false,
                                selectedCategoryId = null,
                                selectedSubcategoryId = null,
                            ),
                        )
                    },
                    shape = androidx.compose.material3.SegmentedButtonDefaults.itemShape(0, 2),
                ) { Text("Expense") }
                SegmentedButton(
                    selected = formState.isIncome,
                    onClick = {
                        onFormChange(
                            formState.copy(
                                isIncome = true,
                                selectedCategoryId = null,
                                selectedSubcategoryId = null,
                            ),
                        )
                    },
                    shape = androidx.compose.material3.SegmentedButtonDefaults.itemShape(1, 2),
                ) { Text("Income") }
            }

            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = formState.amountInput,
                onValueChange = { onFormChange(formState.copy(amountInput = it.filter { ch -> ch.isDigit() || ch == '.' })) },
                label = { Text("Amount") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = formState.txnDateInput,
                onValueChange = { onFormChange(formState.copy(txnDateInput = it)) },
                label = { Text("Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(10.dp))
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { categoryExpanded = !categoryExpanded },
            ) {
                OutlinedTextField(
                    value = selectedCategory?.name ?: "",
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
                    categories.forEach { category ->
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(category.name) },
                            onClick = {
                                categoryExpanded = false
                                onFormChange(
                                    formState.copy(
                                        selectedCategoryId = category.categoryId,
                                        selectedSubcategoryId = category.subcategories.firstOrNull()?.subcategoryId,
                                    ),
                                )
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            ExposedDropdownMenuBox(
                expanded = subcategoryExpanded,
                onExpandedChange = { subcategoryExpanded = !subcategoryExpanded },
            ) {
                OutlinedTextField(
                    value = subcategories.firstOrNull { it.subcategoryId == formState.selectedSubcategoryId }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Subcategory") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = subcategoryExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                )
                DropdownMenu(
                    expanded = subcategoryExpanded,
                    onDismissRequest = { subcategoryExpanded = false },
                ) {
                    subcategories.forEach { sub ->
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(sub.name) },
                            onClick = {
                                subcategoryExpanded = false
                                onFormChange(formState.copy(selectedSubcategoryId = sub.subcategoryId))
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = formState.titleInput,
                onValueChange = { onFormChange(formState.copy(titleInput = it)) },
                label = { Text("Title (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = formState.noteInput,
                onValueChange = { onFormChange(formState.copy(noteInput = it)) },
                label = { Text("Note (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )

            formState.error?.let {
                Text(
                    text = it,
                    color = DesignTokens.urgency.high,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Button(
                onClick = onSubmit,
                enabled = !formState.loading,
                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (formState.loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                } else {
                    Text(if (isEditing) "Save changes" else "Save transaction", color = DesignTokens.base.onDark)
                }
            }
            if (isEditing) {
                TextButton(
                    onClick = onRequestDelete,
                    enabled = !formState.loading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 18.dp),
                ) {
                    Text("Delete transaction", color = DesignTokens.urgency.high)
                }
            } else {
                Spacer(Modifier.height(18.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PersonalMomentSettingsSheet(
    contextAccent: Color,
    state: PersonalMomentSettingsState,
    onDismiss: () -> Unit,
    onChange: (PersonalMomentSettingsState) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit,
) {
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
            Text("Moment settings", color = DesignTokens.base.onDark, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.title,
                onValueChange = { onChange(state.copy(title = it)) },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.targetAmountInput,
                onValueChange = {
                    onChange(state.copy(targetAmountInput = it.filter { ch -> ch.isDigit() || ch == '.' }))
                },
                label = { Text("Target amount") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            Text("Rhythm", color = DesignTokens.base.onDark60, style = DesignTokens.type.caption)
            Spacer(Modifier.height(6.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = state.rhythmMonthly,
                    onClick = { onChange(state.copy(rhythmMonthly = true)) },
                    shape = SegmentedButtonDefaults.itemShape(0, 2),
                ) {
                    Text("Monthly")
                }
                SegmentedButton(
                    selected = !state.rhythmMonthly,
                    onClick = { onChange(state.copy(rhythmMonthly = false)) },
                    shape = SegmentedButtonDefaults.itemShape(1, 2),
                ) {
                    Text("Ends on date")
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.startDateInput,
                onValueChange = { onChange(state.copy(startDateInput = it)) },
                label = { Text("Start date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
            )
            if (!state.rhythmMonthly) {
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = state.endDateInput,
                    onValueChange = { onChange(state.copy(endDateInput = it)) },
                    label = { Text("End date (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.savingMode,
                onValueChange = { onChange(state.copy(savingMode = it)) },
                label = { Text("Saving mode") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.description,
                onValueChange = { onChange(state.copy(description = it)) },
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
            )
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Private moment", color = DesignTokens.base.onDark, fontSize = 14.sp)
                Switch(
                    checked = state.isPrivateMoment,
                    onCheckedChange = { onChange(state.copy(isPrivateMoment = it)) },
                )
            }

            state.error?.let {
                Text(
                    text = it,
                    color = DesignTokens.urgency.high,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Button(
                onClick = onSave,
                enabled = !state.loading,
                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (state.loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                } else {
                    Text("Save changes", color = DesignTokens.base.onDark)
                }
            }
            TextButton(
                onClick = onDelete,
                enabled = !state.loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 14.dp),
            ) {
                Text("Delete moment", color = DesignTokens.urgency.high)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GroupMomentSettingsSheet(
    contextAccent: Color,
    state: GroupMomentSettingsState,
    onDismiss: () -> Unit,
    onChange: (GroupMomentSettingsState) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit,
) {
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
            Text("Group settings", color = DesignTokens.base.onDark, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.title,
                onValueChange = { onChange(state.copy(title = it)) },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.targetAmountInput,
                onValueChange = { onChange(state.copy(targetAmountInput = it.filter { ch -> ch.isDigit() || ch == '.' })) },
                label = { Text("Target amount") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.destination,
                onValueChange = { onChange(state.copy(destination = it)) },
                label = { Text("Destination") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.contributionDueDate,
                onValueChange = { onChange(state.copy(contributionDueDate = it)) },
                label = { Text("Contribution due date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.status,
                onValueChange = { onChange(state.copy(status = it.lowercase())) },
                label = { Text("Status (active/completed/archived)") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            ToggleRow("Send payment reminders", state.sendPaymentReminders) {
                onChange(state.copy(sendPaymentReminders = it))
            }
            ToggleRow("Auto notify on contribution", state.autoNotifyOnContribution) {
                onChange(state.copy(autoNotifyOnContribution = it))
            }
            ToggleRow("Allow partial payments", state.allowPartialPayments) {
                onChange(state.copy(allowPartialPayments = it))
            }
            ToggleRow("Require receipt for expenses", state.requireReceiptForExpenses) {
                onChange(state.copy(requireReceiptForExpenses = it))
            }
            ToggleRow("Require organiser approval", state.requireOrganiserApproval) {
                onChange(state.copy(requireOrganiserApproval = it))
            }

            state.error?.let {
                Text(
                    text = it,
                    color = DesignTokens.urgency.high,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Button(
                onClick = onSave,
                enabled = !state.loading,
                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (state.loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                } else {
                    Text("Save changes", color = DesignTokens.base.onDark)
                }
            }
            TextButton(
                onClick = onDelete,
                enabled = !state.loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 14.dp),
            ) {
                Text("Delete moment", color = DesignTokens.urgency.high)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BusinessMomentSettingsSheet(
    contextAccent: Color,
    state: BusinessMomentSettingsState,
    onDismiss: () -> Unit,
    onChange: (BusinessMomentSettingsState) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit,
) {
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
            Text("Business settings", color = DesignTokens.base.onDark, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.budgetName,
                onValueChange = { onChange(state.copy(budgetName = it)) },
                label = { Text("Budget name") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.totalBudgetInput,
                onValueChange = { onChange(state.copy(totalBudgetInput = it.filter { ch -> ch.isDigit() || ch == '.' })) },
                label = { Text("Total budget") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.budgetPeriod,
                onValueChange = { onChange(state.copy(budgetPeriod = it)) },
                label = { Text("Budget period") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.department,
                onValueChange = { onChange(state.copy(department = it)) },
                label = { Text("Department") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.approvalThresholdInput,
                onValueChange = { onChange(state.copy(approvalThresholdInput = it.filter { ch -> ch.isDigit() || ch == '.' })) },
                label = { Text("Approval threshold") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            ToggleRow("Require receipt for all expenses", state.requireReceiptForAllExpenses) {
                onChange(state.copy(requireReceiptForAllExpenses = it))
            }
            ToggleRow("Auto approve below threshold", state.autoApproveBelowThreshold) {
                onChange(state.copy(autoApproveBelowThreshold = it))
            }
            ToggleRow("Manager approval required", state.managerApprovalRequired) {
                onChange(state.copy(managerApprovalRequired = it))
            }
            ToggleRow("Notify admin on submission", state.notifyAdminOnSubmission) {
                onChange(state.copy(notifyAdminOnSubmission = it))
            }
            ToggleRow("Over budget receipts (policy)", state.overBudgetAlerts) {
                onChange(state.copy(overBudgetAlerts = it))
            }
            ToggleRow("Lock budget when limit hit", state.lockBudgetWhenLimitHit) {
                onChange(state.copy(lockBudgetWhenLimitHit = it))
            }
            Spacer(Modifier.height(8.dp))
            ToggleRow("Weekly digest", state.weeklyDigest) {
                onChange(state.copy(weeklyDigest = it))
            }
            ToggleRow("Pending approval receipts", state.pendingApprovalAlerts) {
                onChange(state.copy(pendingApprovalAlerts = it))
            }
            ToggleRow("Over budget receipts (reminders)", state.reminderOverBudgetAlerts) {
                onChange(state.copy(reminderOverBudgetAlerts = it))
            }
            ToggleRow("Period close receipts reminder", state.periodCloseReminder) {
                onChange(state.copy(periodCloseReminder = it))
            }
            if (state.categoryAllocations.isNotEmpty()) {
                Text(
                    text = "Category allocations",
                    color = DesignTokens.base.onDark,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 10.dp),
                )
                state.categoryAllocations.forEachIndexed { idx, item ->
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = item.amountInput,
                        onValueChange = { value ->
                            val next = state.categoryAllocations.toMutableList()
                            next[idx] = item.copy(amountInput = value.filter { ch -> ch.isDigit() || ch == '.' })
                            onChange(state.copy(categoryAllocations = next))
                        },
                        label = { Text("${item.categoryName} allocation") },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            state.error?.let {
                Text(
                    text = it,
                    color = DesignTokens.urgency.high,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            Button(
                onClick = onSave,
                enabled = !state.loading,
                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (state.loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                } else {
                    Text("Save changes", color = DesignTokens.base.onDark)
                }
            }
            TextButton(
                onClick = onDelete,
                enabled = !state.loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 28.dp),
            ) {
                Text("Delete moment", color = DesignTokens.urgency.high)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BusinessInviteMemberSheet(
    contextAccent: Color,
    sheetKey: Int,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (BusinessBudgetMemberIn) -> Unit,
) {
    var name by remember(sheetKey) { mutableStateOf("") }
    var email by remember(sheetKey) { mutableStateOf("") }
    var role by remember(sheetKey) { mutableStateOf("employee") }
    var limit by remember(sheetKey) { mutableStateOf("") }
    var error by remember(sheetKey) { mutableStateOf<String?>(null) }
    val roleOptions = listOf("employee", "admin")

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
            Text("Invite team member", color = DesignTokens.base.onDark, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it; error = null },
                label = { Text("Member name") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = null },
                label = { Text("Email (used for join/invite)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            Spacer(Modifier.height(10.dp))
            Text("Role", color = DesignTokens.base.onDark60, style = DesignTokens.type.caption)
            Spacer(Modifier.height(6.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                roleOptions.forEachIndexed { idx, item ->
                    SegmentedButton(
                        selected = role == item,
                        onClick = { role = item; error = null },
                        shape = SegmentedButtonDefaults.itemShape(idx, roleOptions.size),
                    ) {
                        Text(item.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() })
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = limit,
                onValueChange = { limit = it; error = null },
                label = { Text("Spend limit (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            error?.let {
                Text(it, color = DesignTokens.urgency.high, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }
            Button(
                onClick = {
                    val n = name.trim()
                    val e = email.trim()
                    if (n.isBlank()) {
                        error = "Enter team member name"
                        return@Button
                    }
                    if (e.isBlank() || !e.contains("@")) {
                        error = "Enter a valid email"
                        return@Button
                    }
                    onSubmit(
                        BusinessBudgetMemberIn(
                            displayName = n,
                            email = e,
                            role = role,
                            limit = limit.trim().ifBlank { null },
                            added = true,
                        ),
                    )
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 18.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                } else {
                    Text("Invite member", color = DesignTokens.base.onDark)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BusinessExpenseSheet(
    contextAccent: Color,
    sheetKey: Int,
    isSubmitting: Boolean,
    defaultKind: String,
    categories: List<Pair<String, String>>,
    catalog: BusinessCatalogOut?,
    vendorOptions: List<String>,
    vendorRecords: List<BusinessVendorRecordRow>,
    onAddVendor: suspend (String) -> Boolean,
    onRenameVendor: suspend (String, String) -> Boolean,
    onDeleteVendor: suspend (String) -> Boolean,
    onDismiss: () -> Unit,
    onSubmit: (BusinessExpenseCreateIn, BusinessReceiptSelection?) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var kind by remember(sheetKey) { mutableStateOf(defaultKind) }
    var title by remember(sheetKey) { mutableStateOf("") }
    var amount by remember(sheetKey) { mutableStateOf("") }
    fun catalogRowsForKind(entryKind: String) = if (entryKind == "purchase") catalog?.purchase.orEmpty() else catalog?.expense.orEmpty()
    fun fallbackMapForKind(entryKind: String) = if (entryKind == "purchase") PURCHASE_CATEGORY_SUBCATEGORY_MAP else EXPENSE_CATEGORY_SUBCATEGORY_MAP
    val initialCatalogRows = catalogRowsForKind(defaultKind)
    var budgetCategoryId by remember(sheetKey) {
        mutableStateOf(
            if (initialCatalogRows.isNotEmpty()) {
                initialCatalogRows.first().budgetCategoryId
            } else {
                categories.firstOrNull()?.first.orEmpty()
            },
        )
    }
    var businessCategory by remember(sheetKey) {
        mutableStateOf(
            if (initialCatalogRows.isNotEmpty()) {
                initialCatalogRows.first().name
            } else if (defaultKind == "purchase") {
                PURCHASE_CATEGORY_SUBCATEGORY_MAP.keys.first()
            } else {
                EXPENSE_CATEGORY_SUBCATEGORY_MAP.keys.first()
            },
        )
    }
    var businessCategoryExpanded by remember(sheetKey) { mutableStateOf(false) }
    var businessSubcategory by remember(sheetKey) {
        mutableStateOf(
            if (initialCatalogRows.isNotEmpty()) {
                initialCatalogRows.first().subcategories.firstOrNull().orEmpty()
            } else if (defaultKind == "purchase") {
                PURCHASE_CATEGORY_SUBCATEGORY_MAP.values.firstOrNull()?.firstOrNull().orEmpty()
            } else {
                EXPENSE_CATEGORY_SUBCATEGORY_MAP.values.firstOrNull()?.firstOrNull().orEmpty()
            },
        )
    }
    var businessSubcategoryExpanded by remember(sheetKey) { mutableStateOf(false) }
    var expensePaidMode by remember(sheetKey) { mutableStateOf("cash") }
    var expensePaidModeExpanded by remember(sheetKey) { mutableStateOf(false) }
    var purchasePaymentStatus by remember(sheetKey) { mutableStateOf("paid") }
    var purchasePaymentStatusExpanded by remember(sheetKey) { mutableStateOf(false) }
    var quantity by remember(sheetKey) { mutableStateOf("") }
    var unit by remember(sheetKey) { mutableStateOf("kg") }
    var unitExpanded by remember(sheetKey) { mutableStateOf(false) }
    var pricePerUnit by remember(sheetKey) { mutableStateOf("") }
    var totalAmount by remember(sheetKey) { mutableStateOf("") }
    var lastPurchaseEditedField by remember(sheetKey) { mutableStateOf<String?>(null) }
    var paidAmount by remember(sheetKey) { mutableStateOf("") }
    val paymentMethods = listOf("cash", "upi", "creditcard", "bank")
    val selectedPaymentMethods = remember(sheetKey) { mutableStateListOf<String>() }
    val paymentAmountInputs = remember(sheetKey) { mutableStateMapOf<String, String>() }
    val purchaseVendors = remember(sheetKey, vendorOptions) {
        mutableStateListOf<String>().apply {
            addAll(vendorOptions.map { it.trim() }.filter { it.isNotBlank() }.distinct())
        }
    }
    var vendor by remember(sheetKey) { mutableStateOf(purchaseVendors.firstOrNull().orEmpty()) }
    var vendorExpanded by remember(sheetKey) { mutableStateOf(false) }
    var showAddVendorInline by remember(sheetKey) { mutableStateOf(false) }
    var showManageVendorsSheet by remember(sheetKey) { mutableStateOf(false) }
    var newVendorName by remember(sheetKey) { mutableStateOf("") }
    var addingVendor by remember(sheetKey) { mutableStateOf(false) }
    var invoice by remember(sheetKey) { mutableStateOf("") }
    var paymentMode by remember(sheetKey) { mutableStateOf("") }
    var dueDate by remember(sheetKey) { mutableStateOf("") }
    var gstin by remember(sheetKey) { mutableStateOf("") }
    var taxAmount by remember(sheetKey) { mutableStateOf("") }
    var note by remember(sheetKey) { mutableStateOf("") }
    var receiptSelection by remember(sheetKey) { mutableStateOf<BusinessReceiptSelection?>(null) }
    var error by remember(sheetKey) { mutableStateOf<String?>(null) }
    val kindOptions = listOf("expense", "purchase")
    val expensePaidModeOptions = listOf("cash", "upi", "card")
    val purchasePaymentStatusOptions = listOf("paid", "partially_paid", "credit")
    val unitOptions = listOf("kg", "lt", "gm")

    fun chooseBudgetCategoryId(entryKind: String): String {
        val catalogRows = catalogRowsForKind(entryKind)
        if (catalogRows.isNotEmpty()) {
            val matched = catalogRows.firstOrNull { row -> row.name.equals(businessCategory, ignoreCase = true) }
            return (matched?.budgetCategoryId ?: catalogRows.firstOrNull()?.budgetCategoryId).orEmpty()
        }
        if (categories.isEmpty()) return ""
        val preferred = if (entryKind == "purchase") {
            listOf("purchase", "inventory", "stock", "material", "procurement")
        } else {
            listOf("expense", "operations", "marketing", "payroll", "logistics", "admin")
        }
        return categories.firstOrNull { (_, label) ->
            preferred.any { key -> label.contains(key, ignoreCase = true) }
        }?.first ?: categories.first().first
    }

    LaunchedEffect(catalog, sheetKey, kind) {
        val rows = catalogRowsForKind(kind)
        if (rows.isEmpty()) return@LaunchedEffect
        val aligned = rows.any { row ->
            row.budgetCategoryId == budgetCategoryId && row.name.equals(businessCategory, ignoreCase = true)
        }
        if (aligned) return@LaunchedEffect
        val byName = rows.firstOrNull { it.name.equals(businessCategory, ignoreCase = true) }
        val row = byName ?: rows.firstOrNull { it.budgetCategoryId == budgetCategoryId } ?: rows.first()
        budgetCategoryId = row.budgetCategoryId
        businessCategory = row.name
        businessSubcategory = row.subcategories.firstOrNull().orEmpty()
    }

    fun format3(v: Double): String = String.format("%.3f", v).trimEnd('0').trimEnd('.')
    fun format2(v: Double): String = String.format("%.2f", v).trimEnd('0').trimEnd('.')
    fun recomputePurchaseFromEditedField(edited: String) {
        val q = quantity.toDoubleOrNull()
        val p = pricePerUnit.toDoubleOrNull()
        val t = totalAmount.toDoubleOrNull()
        val provided = listOf(q, p, t).count { it != null && it > 0.0 }
        if (provided < 2) return
        when (edited) {
            "quantity" -> {
                if (q != null && q > 0.0 && p != null && p > 0.0) {
                    totalAmount = format2(q * p)
                } else if (q != null && q > 0.0 && t != null && t > 0.0 && (p == null || p <= 0.0)) {
                    pricePerUnit = format3(t / q)
                }
            }
            "price" -> {
                if (q != null && q > 0.0 && p != null && p > 0.0) {
                    totalAmount = format2(q * p)
                } else if (p != null && p > 0.0 && t != null && t > 0.0 && (q == null || q <= 0.0)) {
                    quantity = format3(t / p)
                }
            }
            "total" -> {
                if (t != null && t > 0.0 && q != null && q > 0.0) {
                    pricePerUnit = format3(t / q)
                } else if (t != null && t > 0.0 && p != null && p > 0.0) {
                    quantity = format3(t / p)
                }
            }
            else -> {
                if (q != null && q > 0.0 && p != null && p > 0.0) {
                    totalAmount = format2(q * p)
                } else if (t != null && t > 0.0 && q != null && q > 0.0) {
                    pricePerUnit = format3(t / q)
                } else if (t != null && t > 0.0 && p != null && p > 0.0) {
                    quantity = format3(t / p)
                }
            }
        }
    }
    fun paymentSplitsFromUi(): List<BusinessPaymentSplitIn> = selectedPaymentMethods.mapNotNull { method ->
        val amount = paymentAmountInputs[method]?.toDoubleOrNull()
        if (amount != null && amount > 0.0) BusinessPaymentSplitIn(method = method, amount = amount) else null
    }
    fun sanitizeDecimalInput(raw: String): String = raw.filter { ch -> ch.isDigit() || ch == '.' }
    fun cacheUriToReceipt(uri: Uri, preferredPrefix: String): BusinessReceiptSelection? {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val ext = when {
            mime.contains("pdf") -> ".pdf"
            mime.contains("png") -> ".png"
            mime.contains("jpeg") || mime.contains("jpg") -> ".jpg"
            mime.contains("webp") -> ".webp"
            else -> ".bin"
        }
        val file = File(context.cacheDir, "${preferredPrefix}_${System.currentTimeMillis()}$ext")
        return resolver.openInputStream(uri)?.use { input ->
            file.outputStream().use { output -> input.copyTo(output) }
            BusinessReceiptSelection(file = file, mimeType = mime, displayName = file.name)
        }
    }
    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            receiptSelection = cacheUriToReceipt(uri, "business_gallery")
            error = null
        }
    }
    val pdfLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            receiptSelection = cacheUriToReceipt(uri, "business_pdf")
            error = null
        }
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap: Bitmap? ->
        if (bitmap != null) {
            val file = File(context.cacheDir, "business_camera_${System.currentTimeMillis()}.jpg")
            file.outputStream().use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
            }
            receiptSelection = BusinessReceiptSelection(
                file = file,
                mimeType = "image/jpeg",
                displayName = file.name,
            )
            error = null
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
                if (kind == "purchase") "Add purchase request" else "Add expense request",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                kindOptions.forEachIndexed { idx, item ->
                    SegmentedButton(
                        selected = kind == item,
                        onClick = {
                            kind = item
                            val mappedRows = catalogRowsForKind(item)
                            if (mappedRows.isNotEmpty()) {
                                businessCategory = mappedRows.first().name
                                businessSubcategory = mappedRows.first().subcategories.firstOrNull().orEmpty()
                                budgetCategoryId = mappedRows.first().budgetCategoryId
                            } else {
                                val mapForKind = fallbackMapForKind(item)
                                businessCategory = mapForKind.keys.firstOrNull().orEmpty()
                                businessSubcategory = mapForKind[businessCategory]?.firstOrNull().orEmpty()
                                budgetCategoryId = chooseBudgetCategoryId(item)
                            }
                            error = null
                        },
                        shape = SegmentedButtonDefaults.itemShape(idx, kindOptions.size),
                    ) { Text(item.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }) }
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { title = it; error = null },
                label = { Text(if (kind == "purchase") "Purchase title" else "Expense title") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            val catalogRows = catalogRowsForKind(kind)
            val hasCatalogRows = catalogRows.isNotEmpty()
            val businessMap = fallbackMapForKind(kind)
            val businessCategories = if (hasCatalogRows) catalogRows.map { it.name } else businessMap.keys.toList()
            val selectedCatalogRow = catalogRows.firstOrNull { it.name.equals(businessCategory, ignoreCase = true) }
            val subcategoryOptions = if (hasCatalogRows) selectedCatalogRow?.subcategories.orEmpty() else businessMap[businessCategory].orEmpty()
            ExposedDropdownMenuBox(
                expanded = businessCategoryExpanded,
                onExpandedChange = { businessCategoryExpanded = !businessCategoryExpanded },
            ) {
                OutlinedTextField(
                    value = businessCategory,
                    onValueChange = {},
                    label = { Text(if (kind == "purchase") "Purchase category" else "Expense category") },
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = businessCategoryExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                )
                DropdownMenu(
                    expanded = businessCategoryExpanded,
                    onDismissRequest = { businessCategoryExpanded = false },
                    modifier = Modifier.fillMaxWidth(0.92f),
                ) {
                    businessCategories.forEach { label ->
                        TextButton(
                            onClick = {
                                businessCategory = label
                                businessSubcategory = if (hasCatalogRows) {
                                    catalogRows.firstOrNull { it.name.equals(label, ignoreCase = true) }?.subcategories?.firstOrNull().orEmpty()
                                } else {
                                    businessMap[label]?.firstOrNull().orEmpty()
                                }
                                if (hasCatalogRows) {
                                    budgetCategoryId = catalogRows.firstOrNull { it.name.equals(label, ignoreCase = true) }?.budgetCategoryId.orEmpty()
                                }
                                businessCategoryExpanded = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(label, color = DesignTokens.base.onDark) }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            ExposedDropdownMenuBox(
                expanded = businessSubcategoryExpanded,
                onExpandedChange = { businessSubcategoryExpanded = !businessSubcategoryExpanded },
            ) {
                OutlinedTextField(
                    value = businessSubcategory,
                    onValueChange = {},
                    label = { Text("Subcategory") },
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = businessSubcategoryExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                )
                DropdownMenu(
                    expanded = businessSubcategoryExpanded,
                    onDismissRequest = { businessSubcategoryExpanded = false },
                    modifier = Modifier.fillMaxWidth(0.92f),
                ) {
                    subcategoryOptions.forEach { sub ->
                        TextButton(
                            onClick = {
                                businessSubcategory = sub
                                businessSubcategoryExpanded = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(sub, color = DesignTokens.base.onDark) }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            if (kind == "expense") {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = sanitizeDecimalInput(it); error = null },
                    label = { Text("Amount") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                ExposedDropdownMenuBox(
                    expanded = expensePaidModeExpanded,
                    onExpandedChange = { expensePaidModeExpanded = !expensePaidModeExpanded },
                ) {
                    OutlinedTextField(
                        value = expensePaidMode.uppercase(),
                        onValueChange = {},
                        label = { Text("Paid via") },
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expensePaidModeExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                    )
                    DropdownMenu(expanded = expensePaidModeExpanded, onDismissRequest = { expensePaidModeExpanded = false }) {
                        expensePaidModeOptions.forEach { mode ->
                            TextButton(
                                onClick = {
                                    expensePaidMode = mode
                                    expensePaidModeExpanded = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text(mode.uppercase(), color = DesignTokens.base.onDark) }
                        }
                    }
                }
            } else {
                OutlinedTextField(
                    value = quantity,
                    onValueChange = {
                        quantity = sanitizeDecimalInput(it)
                        lastPurchaseEditedField = "quantity"
                        recomputePurchaseFromEditedField("quantity")
                        error = null
                    },
                    label = { Text("Quantity") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                ExposedDropdownMenuBox(
                    expanded = unitExpanded,
                    onExpandedChange = { unitExpanded = !unitExpanded },
                ) {
                    OutlinedTextField(
                        value = unit.uppercase(),
                        onValueChange = {},
                        label = { Text("Unit") },
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = unitExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                    )
                    DropdownMenu(expanded = unitExpanded, onDismissRequest = { unitExpanded = false }) {
                        unitOptions.forEach { option ->
                            TextButton(
                                onClick = {
                                    unit = option
                                    unitExpanded = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text(option.uppercase(), color = DesignTokens.base.onDark) }
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = pricePerUnit,
                    onValueChange = {
                        pricePerUnit = sanitizeDecimalInput(it)
                        lastPurchaseEditedField = "price"
                        recomputePurchaseFromEditedField("price")
                        error = null
                    },
                    label = { Text("Price per ${unit.uppercase()}") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = totalAmount,
                    onValueChange = {
                        totalAmount = sanitizeDecimalInput(it)
                        lastPurchaseEditedField = "total"
                        recomputePurchaseFromEditedField("total")
                        error = null
                    },
                    label = { Text("Total amount") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
                ExposedDropdownMenuBox(
                    expanded = vendorExpanded,
                    onExpandedChange = { vendorExpanded = !vendorExpanded },
                ) {
                    OutlinedTextField(
                        value = vendor,
                        onValueChange = {},
                        label = { Text("Vendor name") },
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = vendorExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                    )
                    DropdownMenu(
                        expanded = vendorExpanded,
                        onDismissRequest = { vendorExpanded = false },
                        modifier = Modifier.fillMaxWidth(0.92f),
                    ) {
                        purchaseVendors.forEach { v ->
                            TextButton(
                                onClick = {
                                    vendor = v
                                    vendorExpanded = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text(v, color = DesignTokens.base.onDark) }
                        }
                    }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        if (purchaseVendors.isEmpty()) "No vendors yet" else "${purchaseVendors.size} vendors",
                        color = DesignTokens.base.brandText,
                        fontSize = 11.sp,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = { showManageVendorsSheet = true }) {
                            Text("Manage", color = contextAccent, fontSize = 12.sp)
                        }
                        TextButton(onClick = { showAddVendorInline = !showAddVendorInline }) {
                            Text(if (showAddVendorInline) "Cancel" else "+ Add vendor", color = contextAccent, fontSize = 12.sp)
                        }
                    }
                }
                if (showAddVendorInline) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedTextField(
                            value = newVendorName,
                            onValueChange = { newVendorName = it; error = null },
                            label = { Text("New vendor") },
                            modifier = Modifier.weight(1f),
                        )
                        Button(
                            onClick = {
                                val candidate = newVendorName.trim()
                                if (candidate.isBlank()) {
                                    error = "Vendor name cannot be blank"
                                    return@Button
                                }
                                scope.launch {
                                    addingVendor = true
                                    val ok = onAddVendor(candidate)
                                    addingVendor = false
                                    if (!ok) {
                                        error = "Could not save vendor right now"
                                        return@launch
                                    }
                                    if (purchaseVendors.none { it.equals(candidate, ignoreCase = true) }) {
                                        purchaseVendors.add(candidate)
                                    }
                                    vendor = purchaseVendors.firstOrNull { it.equals(candidate, ignoreCase = true) } ?: candidate
                                    newVendorName = ""
                                    showAddVendorInline = false
                                }
                            },
                            enabled = !addingVendor,
                            colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                        ) {
                            if (addingVendor) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                            } else {
                                Text("Add", color = DesignTokens.base.onDark)
                            }
                        }
                    }
                }
                if (showManageVendorsSheet) {
                    BusinessVendorManageSheet(
                        contextAccent = contextAccent,
                        vendorRecords = vendorRecords,
                        onDismiss = { showManageVendorsSheet = false },
                        onRenameVendor = onRenameVendor,
                        onDeleteVendor = onDeleteVendor,
                    )
                }
                Spacer(Modifier.height(10.dp))
                ExposedDropdownMenuBox(
                    expanded = purchasePaymentStatusExpanded,
                    onExpandedChange = { purchasePaymentStatusExpanded = !purchasePaymentStatusExpanded },
                ) {
                    OutlinedTextField(
                        value = purchasePaymentStatus.replace('_', ' ').replaceFirstChar { ch -> ch.uppercase() },
                        onValueChange = {},
                        label = { Text("Paid status") },
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = purchasePaymentStatusExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                    )
                    DropdownMenu(expanded = purchasePaymentStatusExpanded, onDismissRequest = { purchasePaymentStatusExpanded = false }) {
                        purchasePaymentStatusOptions.forEach { status ->
                            TextButton(
                                onClick = {
                                    purchasePaymentStatus = status
                                    purchasePaymentStatusExpanded = false
                                    if (status == "credit") paidAmount = "0"
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(status.replace('_', ' ').replaceFirstChar { ch -> ch.uppercase() }, color = DesignTokens.base.onDark)
                            }
                        }
                    }
                }
                if (purchasePaymentStatus == "partially_paid" || purchasePaymentStatus == "credit") {
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = paidAmount,
                        onValueChange = { paidAmount = sanitizeDecimalInput(it); error = null },
                        label = { Text("Paid amount") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Text("Payment methods", color = DesignTokens.base.onDark, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(top = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                paymentMethods.forEach { method ->
                    val selected = selectedPaymentMethods.contains(method)
                    FilterChip(
                        selected = selected,
                        onClick = {
                            if (selected) {
                                selectedPaymentMethods.remove(method)
                                paymentAmountInputs.remove(method)
                            } else {
                                selectedPaymentMethods.add(method)
                                paymentAmountInputs[method] = ""
                            }
                        },
                        label = { Text(method.replaceFirstChar { it.uppercase() }, fontSize = 11.sp) },
                    )
                }
            }
            selectedPaymentMethods.forEach { method ->
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = paymentAmountInputs[method].orEmpty(),
                    onValueChange = {
                        paymentAmountInputs[method] = sanitizeDecimalInput(it)
                        error = null
                    },
                    label = { Text("${method.replaceFirstChar { it.uppercase() }} amount") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(value = invoice, onValueChange = { invoice = it; error = null }, label = { Text("Invoice number (optional)") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(value = paymentMode, onValueChange = { paymentMode = it; error = null }, label = { Text("Payment mode note (optional)") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(value = dueDate, onValueChange = { dueDate = it; error = null }, label = { Text("Due date YYYY-MM-DD (optional)") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(value = gstin, onValueChange = { gstin = it.uppercase(); error = null }, label = { Text("GSTIN (optional)") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = taxAmount,
                onValueChange = { taxAmount = sanitizeDecimalInput(it); error = null },
                label = { Text("Tax amount (optional)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(value = note, onValueChange = { note = it; error = null }, label = { Text("Approval note (optional)") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            Spacer(Modifier.height(10.dp))
            Text(
                text = receiptSelection?.let { "Receipt: ${it.displayName}" } ?: "Receipt: not attached",
                color = DesignTokens.base.brandText,
                fontSize = 12.sp,
            )
            Row(modifier = Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                TextButton(onClick = { cameraLauncher.launch(null) }) { Text("Camera", color = contextAccent, fontSize = 12.sp) }
                TextButton(onClick = { galleryLauncher.launch("image/*") }) { Text("Gallery", color = contextAccent, fontSize = 12.sp) }
                TextButton(onClick = { pdfLauncher.launch(arrayOf("application/pdf")) }) { Text("PDF", color = contextAccent, fontSize = 12.sp) }
                if (receiptSelection != null) {
                    TextButton(onClick = { receiptSelection = null }) { Text("Clear", color = DesignTokens.urgency.high, fontSize = 12.sp) }
                }
            }
            error?.let {
                Text(it, color = DesignTokens.urgency.high, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }
            Button(
                onClick = {
                    if (catalogRowsForKind(kind).isNotEmpty()) {
                        budgetCategoryId = chooseBudgetCategoryId(kind)
                    } else if (budgetCategoryId.isBlank()) {
                        budgetCategoryId = chooseBudgetCategoryId(kind)
                    }
                    if (budgetCategoryId.isBlank()) {
                        error = "No budget category available"
                        return@Button
                    }
                    if (businessCategory.isBlank()) {
                        error = "Pick a category"
                        return@Button
                    }
                    if (businessSubcategory.isBlank()) {
                        error = "Pick a subcategory"
                        return@Button
                    }
                    if (dueDate.isNotBlank() && !dueDate.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
                        error = "Due date must be YYYY-MM-DD"
                        return@Button
                    }
                    val paymentSplits = paymentSplitsFromUi()
                    if (selectedPaymentMethods.isNotEmpty() && paymentSplits.size != selectedPaymentMethods.size) {
                        error = "Enter valid amount for each selected payment method"
                        return@Button
                    }
                    val paymentSplitTotal = paymentSplits.sumOf { it.amount }
                    val categoryKey = businessCategory.lowercase().replace(" ", "_")
                    val subcategoryLabel = "$businessCategory · $businessSubcategory"
                    val payload = if (kind == "expense") {
                        val amountNum = amount.toDoubleOrNull()
                        if (amountNum == null || amountNum <= 0.0) {
                            error = "Enter a valid amount"
                            return@Button
                        }
                        if (paymentSplits.isNotEmpty() && kotlin.math.abs(paymentSplitTotal - amountNum) > 0.01) {
                            error = "Payment split total must match expense amount"
                            return@Button
                        }
                        BusinessExpenseCreateIn(
                            amount = amountNum,
                            categoryId = budgetCategoryId,
                            categoryKey = categoryKey,
                            title = title.trim().ifBlank { "Expense" },
                            subcategoryLabel = subcategoryLabel,
                            entryKind = "expense",
                            paidMode = expensePaidMode,
                            approvalNote = note.trim().ifBlank { null },
                            invoiceNumber = invoice.trim().ifBlank { null },
                            expenseOrPurchase = "expense",
                            paymentMode = paymentMode.trim().ifBlank { null },
                            dueDate = dueDate.trim().ifBlank { null },
                            gstin = gstin.trim().ifBlank { null },
                            taxAmount = taxAmount.trim().toDoubleOrNull(),
                            paymentSplits = paymentSplits,
                            receiptAttached = receiptSelection != null,
                        )
                    } else {
                        recomputePurchaseFromEditedField(lastPurchaseEditedField ?: "total")
                        val quantityNum = quantity.toDoubleOrNull()
                        val priceNum = pricePerUnit.toDoubleOrNull()
                        val totalNum = totalAmount.toDoubleOrNull()
                        if (quantityNum == null || quantityNum <= 0.0 || priceNum == null || priceNum <= 0.0 || totalNum == null || totalNum <= 0.0) {
                            error = "Enter any two of quantity/price/total to auto-calculate the third"
                            return@Button
                        }
                        if (vendor.trim().isBlank()) {
                            error = "Vendor name is required for purchase"
                            return@Button
                        }
                        val paidAmountNum = when (purchasePaymentStatus) {
                            "paid" -> totalNum
                            "credit" -> 0.0
                            else -> paidAmount.toDoubleOrNull()
                        }
                        if ((purchasePaymentStatus == "partially_paid" || purchasePaymentStatus == "credit") && paidAmountNum == null) {
                            error = "Enter paid amount"
                            return@Button
                        }
                        if (paidAmountNum != null && (paidAmountNum < 0.0 || paidAmountNum > totalNum)) {
                            error = "Paid amount must be between 0 and total"
                            return@Button
                        }
                        val expectedPaid = when (purchasePaymentStatus) {
                            "paid" -> totalNum
                            "credit" -> 0.0
                            else -> paidAmountNum ?: 0.0
                        }
                        if (paymentSplits.isNotEmpty() && kotlin.math.abs(paymentSplitTotal - expectedPaid) > 0.01) {
                            error = "Payment split total must match paid amount"
                            return@Button
                        }
                        BusinessExpenseCreateIn(
                            amount = totalNum,
                            categoryId = budgetCategoryId,
                            categoryKey = categoryKey,
                            title = title.trim().ifBlank { "Purchase" },
                            subcategoryLabel = subcategoryLabel,
                            entryKind = "purchase",
                            purchasePaymentStatus = purchasePaymentStatus,
                            quantity = quantityNum,
                            unit = unit,
                            pricePerUnit = priceNum,
                            totalAmount = totalNum,
                            paidAmount = paidAmountNum,
                            approvalNote = note.trim().ifBlank { null },
                            vendorName = vendor.trim(),
                            invoiceNumber = invoice.trim().ifBlank { null },
                            expenseOrPurchase = "purchase",
                            paymentMode = paymentMode.trim().ifBlank { null },
                            dueDate = dueDate.trim().ifBlank { null },
                            gstin = gstin.trim().ifBlank { null },
                            taxAmount = taxAmount.trim().toDoubleOrNull(),
                            paymentSplits = paymentSplits,
                            receiptAttached = receiptSelection != null,
                        )
                    }
                    onSubmit(payload, receiptSelection)
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 18.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DesignTokens.base.onDark, strokeWidth = 2.dp)
                } else {
                    Text(if (kind == "purchase") "Submit purchase" else "Submit expense", color = DesignTokens.base.onDark)
                }
            }
        }
    }
}

private fun readableApiError(throwable: Throwable?): String {
    val http = throwable as? HttpException
    if (http == null) {
        return throwable?.message ?: "Request failed"
    }
    val bodyText = try {
        http.response()?.errorBody()?.string()
    } catch (_: Throwable) {
        null
    }
    if (bodyText.isNullOrBlank()) {
        return throwable.message ?: "HTTP ${http.code()} error"
    }
    return try {
        val root = Json.parseToJsonElement(bodyText)
        extractApiDetail(root) ?: (throwable.message ?: "HTTP ${http.code()} error")
    } catch (_: Throwable) {
        throwable.message ?: "HTTP ${http.code()} error"
    }
}

private fun extractApiDetail(node: JsonElement?): String? {
    when (node) {
        null -> return null
        is JsonObject -> {
            val detail = node["detail"]
            val nested = extractApiDetail(detail)
            if (!nested.isNullOrBlank()) return nested
            val message = node["message"]?.toString()?.trim('"')
            if (!message.isNullOrBlank()) return message
            return null
        }
        is JsonArray -> {
            val parts = node.mapNotNull { extractApiDetail(it) }.filter { it.isNotBlank() }
            return if (parts.isNotEmpty()) parts.joinToString("; ") else null
        }
        else -> {
            val raw = node.toString().trim('"')
            return raw.ifBlank { null }
        }
    }
}

@Composable
private fun ToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = DesignTokens.base.onDark, fontSize = 13.sp)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BusinessVendorManageSheet(
    contextAccent: Color,
    vendorRecords: List<BusinessVendorRecordRow>,
    onDismiss: () -> Unit,
    onRenameVendor: suspend (String, String) -> Boolean,
    onDeleteVendor: suspend (String) -> Boolean,
) {
    val scope = rememberCoroutineScope()
    var busyVendorId by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
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
                "Manage vendors",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            if (vendorRecords.isEmpty()) {
                Text(
                    "No saved vendors yet.",
                    color = DesignTokens.base.brandText,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 10.dp, bottom = 20.dp),
                )
            } else {
                vendorRecords.forEach { record ->
                    var editedName by remember(record.vendorId, record.vendorName) { mutableStateOf(record.vendorName) }
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(DesignTokens.base.s200)
                            .padding(10.dp),
                    ) {
                        OutlinedTextField(
                            value = editedName,
                            onValueChange = { editedName = it; error = null },
                            label = { Text("Vendor name") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        busyVendorId = record.vendorId
                                        val ok = onDeleteVendor(record.vendorId)
                                        busyVendorId = null
                                        if (!ok) {
                                            error = "Could not delete vendor"
                                        }
                                    }
                                },
                                enabled = busyVendorId == null,
                            ) {
                                Text("Delete", color = DesignTokens.urgency.high, fontSize = 12.sp)
                            }
                            Button(
                                onClick = {
                                    val candidate = editedName.trim()
                                    if (candidate.isBlank()) {
                                        error = "Vendor name cannot be blank"
                                        return@Button
                                    }
                                    scope.launch {
                                        busyVendorId = record.vendorId
                                        val ok = onRenameVendor(record.vendorId, candidate)
                                        busyVendorId = null
                                        if (!ok) {
                                            error = "Could not rename vendor"
                                        }
                                    }
                                },
                                enabled = busyVendorId == null,
                                colors = ButtonDefaults.buttonColors(containerColor = contextAccent),
                            ) {
                                if (busyVendorId == record.vendorId) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        color = DesignTokens.base.onDark,
                                        strokeWidth = 2.dp,
                                    )
                                } else {
                                    Text("Save", color = DesignTokens.base.onDark)
                                }
                            }
                        }
                    }
                }
            }
            error?.let {
                Text(
                    it,
                    color = DesignTokens.urgency.high,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            Spacer(Modifier.height(18.dp))
        }
    }
}

@Composable
private fun EmptyStateCard(
    title: String,
    subtitle: String,
    cta: String,
    templates: List<HomeEmptyTemplate>,
    accent: Color,
    accentEnd: Color,
    contextLabel: String,
    onPrimaryCta: () -> Unit,
    onTemplateRow: (HomeEmptyTemplate) -> Unit,
) {
    Column(
        modifier = Modifier
            .padding(top = 20.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(DesignTokens.base.s100)
            .padding(16.dp),
    ) {
        Text(
            contextLabel,
            color = DesignTokens.base.onDark40,
            style = DesignTokens.type.micro,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Text(title, color = DesignTokens.base.onDark, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Text(
            text = subtitle,
            color = DesignTokens.base.brandText,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 6.dp),
        )
        Box(
            modifier = Modifier
                .padding(top = 14.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Brush.horizontalGradient(listOf(accent, accentEnd)))
                .clickable(onClick = onPrimaryCta)
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(cta, color = DesignTokens.semantic.ctaText, style = DesignTokens.type.label)
        }
        Text(
            "Starter plans",
            color = DesignTokens.base.onDark,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 14.dp, bottom = 6.dp),
        )
        templates.forEach { template ->
            val rowModifier = Modifier
                .padding(top = 6.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(DesignTokens.base.s200)
                .padding(1.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(DesignTokens.base.s200)
                .padding(horizontal = 12.dp, vertical = 10.dp)
            when (template) {
                is HomeEmptyTemplate.Simple -> {
                    Box(modifier = rowModifier.clickable { onTemplateRow(template) }) {
                        Text(template.label, color = DesignTokens.base.onDark, fontSize = 13.sp)
                    }
                }
                is HomeEmptyTemplate.WithPreset -> {
                    Box(
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DesignTokens.base.s200)
                            .clickable { onTemplateRow(template) }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        Column {
                            Text(template.preset.title, color = DesignTokens.base.onDark, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                template.preset.subtitle,
                                color = DesignTokens.base.onDark40,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                }
                is HomeEmptyTemplate.WithGroupPreset -> {
                    Box(
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DesignTokens.base.s200)
                            .clickable { onTemplateRow(template) }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        Column {
                            Text(template.preset.title, color = DesignTokens.base.onDark, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                template.preset.subtitle,
                                color = DesignTokens.base.onDark40,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                }
                is HomeEmptyTemplate.WithBusinessPreset -> {
                    Box(
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DesignTokens.base.s200)
                            .clickable { onTemplateRow(template) }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        Column {
                            Text(
                                template.preset.budgetName,
                                color = DesignTokens.base.onDark,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                template.preset.subtitle,
                                color = DesignTokens.base.onDark40,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatTxnAmount(amount: Double): String =
    if (amount % 1.0 == 0.0) amount.toInt().toString() else amount.toString()

private fun timeOfDayLabel(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
        hour < 12 -> "morning"
        hour < 17 -> "afternoon"
        else -> "evening"
    }
}
