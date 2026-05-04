import Combine
import SwiftUI
import UniformTypeIdentifiers

enum AppRoute {
    case splash
    case onboarding
    case auth
    case main
}

enum MainTab: String, CaseIterable, Identifiable {
    case today
    case plan
    case activity
    case people
    case me

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: return "Today"
        case .plan: return "Plan"
        case .activity: return "Activity"
        case .people: return "People"
        case .me: return "Me"
        }
    }

    var icon: String {
        switch self {
        case .today: return "calendar"
        case .plan: return "target"
        case .activity: return "list.bullet.rectangle"
        case .people: return "person.2"
        case .me: return "person.crop.circle"
        }
    }

    func title(for context: MomentraContext) -> String {
        switch self {
        case .people where context == .personal: return "Insights"
        default: return title
        }
    }

    func icon(for context: MomentraContext) -> String {
        switch self {
        case .people where context == .personal: return "chart.pie.fill"
        default: return icon
        }
    }
}

struct ContextRouterView: View {
    var body: some View { MainShellView() }
}

@MainActor
final class MainShellViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var personalMomentsCount = 0
    @Published var personalMoments: [PersonalMomentItemOut] = []
    @Published var personalTransactionsCount = 0
    @Published var personalRecentTransactions: [PersonalTransactionOut] = []
    @Published var groupMomentsCount = 0
    @Published var groupMemberCount = 0
    @Published var groupExpenseCount = 0
    @Published var businessBudgetsCount = 0
    @Published var businessPendingApprovalsCount = 0
    @Published var businessVendorsCount = 0

    @Published var groupMoments: [GroupMomentOut] = []
    @Published var businessBudgets: [BusinessBudgetCreateOut] = []
    @Published var businessWorkspaces: [BusinessWorkspaceOut] = []
    @Published var businessWorkspaceUnits: [BusinessUnitOut] = []
    /// Personal signals with `signal_type` prefixed `circle_` (Circle shell uses personal_signals as staging).
    @Published var circleSignalsCount = 0
    @Published var circleSignals: [PersonalSignalOut] = []
    /// Detail for ``selectedGroupMomentId`` (drives Group Today / Plan / Activity / People + Add flows).
    @Published var selectedGroupDetail: GroupMomentDetailOut?
    /// Which group moment is focused; kept in sync when the moments list changes.
    @Published var selectedGroupMomentId: String = ""
    @Published var firstBusinessCatalog: BusinessCatalogOut?

    /// Larger ledger fetch for Personal Today, Activity (sectioned), and Insights.
    static let personalTransactionsFetchLimit = 200

    var personalTransactionsToday: [PersonalTransactionOut] {
        let cal = Calendar.current
        let todayStart = cal.startOfDay(for: Date())
        return personalRecentTransactions.filter { t in
            guard let d = t.txnDate else { return false }
            return cal.isDate(d, inSameDayAs: todayStart)
        }
    }

    var personalTodaySpendTotal: Double {
        personalTransactionsToday.filter { !$0.isIncome }.map(\.amount).reduce(0, +)
    }

    var personalTodayIncomeTotal: Double {
        personalTransactionsToday.filter(\.isIncome).map(\.amount).reduce(0, +)
    }

    var personalActivitySections: [(day: Date, transactions: [PersonalTransactionOut])] {
        let cal = Calendar.current
        let sorted = personalRecentTransactions.sorted {
            ($0.txnDate ?? .distantPast) > ($1.txnDate ?? .distantPast)
        }
        var sections: [(day: Date, transactions: [PersonalTransactionOut])] = []
        for t in sorted {
            guard let d = t.txnDate else { continue }
            let sod = cal.startOfDay(for: d)
            if let idx = sections.indices.last, cal.isDate(sections[idx].day, inSameDayAs: sod) {
                var block = sections[idx]
                block.transactions.append(t)
                sections[idx] = block
            } else {
                sections.append((day: sod, transactions: [t]))
            }
        }
        return sections
    }

    var personalSpendByCategory: [(category: String, total: Double)] {
        let expenses = personalRecentTransactions.filter { !$0.isIncome }
        var totals: [String: Double] = [:]
        for t in expenses {
            let raw = t.category?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let key = raw.isEmpty ? "Other" : raw
            totals[key, default: 0] += t.amount
        }
        return totals.map { (category: $0.key, total: $0.value) }.sorted { $0.total > $1.total }
    }

    // MARK: - Group shell (picker-selected moment)

    private static func groupExpenseDayKey(_ raw: String) -> String {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.count >= 10 { return String(t.prefix(10)) }
        return t
    }

    var groupExpensesToday: [GroupExpenseOut] {
        guard let d = selectedGroupDetail else { return [] }
        let today = PersonalBookDateFormatting.yyyyMMdd()
        return d.expenses.filter { Self.groupExpenseDayKey($0.expenseDate) == today }
    }

    var groupTodayExpenseTotal: Double {
        groupExpensesToday.map(\.amount).reduce(0, +)
    }

    var groupTodayExpenseCount: Int {
        groupExpensesToday.count
    }

    /// Expenses grouped by `YYYY-MM-DD` book day, sections sorted newest first.
    var groupExpenseSections: [(dayKey: String, expenses: [GroupExpenseOut])] {
        guard let d = selectedGroupDetail else { return [] }
        let grouped = Dictionary(grouping: d.expenses) { Self.groupExpenseDayKey($0.expenseDate) }
        let keys = grouped.keys.sorted(by: >)
        return keys.map { key in
            let rows = (grouped[key] ?? []).sorted { $0.expenseDate > $1.expenseDate }
            return (dayKey: key, expenses: rows)
        }
    }

    func refresh(for context: MomentraContext, auth: AuthManager) async {
        guard let token = auth.getAccessToken() else {
            errorMessage = "Unauthorized session"
            return
        }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            switch context {
            case .personal:
                let moments = try await NetworkService.shared.fetchPersonalMoments(token: token)
                let txns: PersonalTransactionListOut = try await NetworkService.shared.request(
                    endpoint: "/personal/transactions?kind=all&limit=\(Self.personalTransactionsFetchLimit)",
                    token: token
                )
                personalMoments = moments
                personalMomentsCount = moments.count
                personalRecentTransactions = txns.transactions
                personalTransactionsCount = txns.transactions.count
            case .group:
                let groups: GroupMomentListOut = try await NetworkService.shared.request(endpoint: "/group/moments", token: token)
                groupMoments = groups.moments
                groupMomentsCount = groups.moments.count
                syncSelectedGroupMomentId(with: groups.moments)
                if !selectedGroupMomentId.isEmpty {
                    let detail: GroupMomentDetailOut = try await NetworkService.shared.request(
                        endpoint: "/group/moments/\(selectedGroupMomentId)",
                        token: token
                    )
                    selectedGroupDetail = detail
                    groupMemberCount = detail.members.count
                    groupExpenseCount = detail.expenses.count
                } else {
                    selectedGroupDetail = nil
                    groupMemberCount = 0
                    groupExpenseCount = 0
                }
            case .business:
                let budgets: BusinessBudgetListOut = try await NetworkService.shared.request(endpoint: "/business/moments", token: token)
                businessBudgets = budgets.budgets
                businessBudgetsCount = budgets.budgets.count
                if let first = budgets.budgets.first {
                    businessPendingApprovalsCount = first.pendingApprovals?.count ?? 0
                    businessVendorsCount = first.vendors?.count ?? 0
                    firstBusinessCatalog = try? await NetworkService.shared.businessBudgetCatalog(budgetId: first.id, token: token)
                } else {
                    firstBusinessCatalog = nil
                    businessPendingApprovalsCount = 0
                    businessVendorsCount = 0
                }
                do {
                    let workspaces = try await NetworkService.shared.listBusinessWorkspaces(token: token)
                    businessWorkspaces = workspaces
                    if let w = workspaces.first {
                        businessWorkspaceUnits = try await NetworkService.shared.listBusinessUnits(workspaceId: w.workspaceId, token: token)
                    } else {
                        businessWorkspaceUnits = []
                    }
                } catch {
                    businessWorkspaces = []
                    businessWorkspaceUnits = []
                }
            case .circle:
                let signals: [PersonalSignalOut] = try await NetworkService.shared.request(
                    endpoint: "/personal/signals?limit=50",
                    token: token
                )
                let circleOnly = signals.filter { $0.signalType.hasPrefix("circle_") }
                circleSignals = circleOnly
                circleSignalsCount = circleOnly.count
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// After user picks a moment from the shell picker, load members/expenses/categories for that moment.
    func loadSelectedGroupMomentDetail(momentId: String, auth: AuthManager) async {
        guard let token = auth.getAccessToken() else {
            errorMessage = "Unauthorized session"
            return
        }
        guard groupMoments.contains(where: { $0.id == momentId }) else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let detail: GroupMomentDetailOut = try await NetworkService.shared.request(
                endpoint: "/group/moments/\(momentId)",
                token: token
            )
            selectedGroupMomentId = momentId
            selectedGroupDetail = detail
            groupMemberCount = detail.members.count
            groupExpenseCount = detail.expenses.count
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func syncSelectedGroupMomentId(with moments: [GroupMomentOut]) {
        guard !moments.isEmpty else {
            selectedGroupMomentId = ""
            return
        }
        let ids = Set(moments.map(\.id))
        if ids.contains(selectedGroupMomentId) { return }
        selectedGroupMomentId = moments[0].id
    }
}

struct MainShellView: View {
    @ObservedObject private var auth = AuthManager.shared
    @EnvironmentObject private var momentraTheme: MomentraTheme
    @StateObject private var viewModel = MainShellViewModel()
    @State private var selectedContext: MomentraContext = .personal
    @State private var selectedTab: MainTab = .today
    @State private var seededContextFromProfile = false
    @State private var showAddSheet = false
    @State private var personalMomentDetail: PersonalMomentItemOut?
    @State private var personalTxnEditing: PersonalTransactionOut?
    @State private var showPersonalCreateMoment = false
    @State private var personalCreateMomentSubmitting = false
    @State private var showGroupMomentDetail = false
    @State private var groupExpenseDetail: GroupExpenseOut?
    @State private var showGroupCreateMoment = false
    @State private var groupCreateMomentSubmitting = false

    var body: some View {
        MomentraScreenChrome(
            context: selectedContext,
            headerHeight: selectedContext == .group && !viewModel.groupMoments.isEmpty ? 188 : 160,
            orbSize: 360,
            orbOffsetY: -178,
            orbExtraOpacity: 0.02
        ) { _ in
            ZStack(alignment: .bottom) {
                VStack(spacing: 0) {
                    ContextSwitcher(selectedContext: $selectedContext)
                        .padding(.horizontal, 16)
                        .padding(.top, 8)

                    Rectangle()
                        .fill(MomentraBase.s300.opacity(0.45))
                        .frame(height: 0.5)

                    if selectedContext == .group, !viewModel.groupMoments.isEmpty {
                        GroupMomentPickerBar(viewModel: viewModel, auth: auth)
                        Rectangle()
                            .fill(MomentraBase.s300.opacity(0.45))
                            .frame(height: 0.5)
                    }

                    TabContentView(
                        context: selectedContext,
                        tab: selectedTab,
                        viewModel: viewModel,
                        auth: auth,
                        onSelectPersonalMoment: { personalMomentDetail = $0 },
                        onSelectPersonalTransaction: { personalTxnEditing = $0 },
                        onOpenPersonalCreateMoment: { showPersonalCreateMoment = true },
                        onOpenAddSheet: { showAddSheet = true },
                        onGroupPlanMomentTap: { g in Task { await openGroupMomentFromPlan(moment: g) } },
                        onSelectGroupExpense: { groupExpenseDetail = $0 },
                        onOpenGroupCreateMoment: { showGroupCreateMoment = true }
                    )
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

                    BottomNavBar(selectedTab: $selectedTab, context: selectedContext)
                        .padding(.horizontal, 16)
                        .padding(.top, 10)
                        .padding(.bottom, 8)
                }

                FloatingAddButton(context: selectedContext) { showAddSheet = true }
                    .padding(.bottom, 66)
            }
        }
        .preferredColorScheme(.dark)
        .momentraContext(selectedContext)
        .tint(DesignTokens.theme(for: selectedContext).accent)
        .sheet(isPresented: $showAddSheet) {
            AddActionSheet(context: selectedContext, auth: auth, viewModel: viewModel) {
                Task { await viewModel.refresh(for: selectedContext, auth: auth) }
            }
        }
        .sheet(item: $personalMomentDetail) { moment in
            PersonalMomentDetailView(
                moment: moment,
                auth: auth,
                viewModel: viewModel,
                onDismiss: { personalMomentDetail = nil },
                onRefresh: { await viewModel.refresh(for: .personal, auth: auth) },
                onAddExpense: {
                    personalMomentDetail = nil
                    DispatchQueue.main.async { showAddSheet = true }
                }
            )
        }
        .sheet(item: $personalTxnEditing) { txn in
            PersonalTransactionEditSheet(transaction: txn, auth: auth) {
                personalTxnEditing = nil
                Task { await viewModel.refresh(for: .personal, auth: auth) }
            }
        }
        .sheet(isPresented: $showPersonalCreateMoment) {
            PersonalCreateMomentView(
                preset: nil,
                sheetId: 1,
                isSubmitting: personalCreateMomentSubmitting,
                onCancel: { showPersonalCreateMoment = false },
                onCreate: { body in
                    Task { await submitPersonalMomentCreate(body: body) }
                }
            )
        }
        .sheet(isPresented: $showGroupMomentDetail) {
            if let d = viewModel.selectedGroupDetail {
                GroupMomentDetailView(
                    detail: d,
                    auth: auth,
                    onDismiss: { showGroupMomentDetail = false },
                    onRefresh: { await viewModel.refresh(for: .group, auth: auth) },
                    onAddExpense: {
                        showGroupMomentDetail = false
                        DispatchQueue.main.async { showAddSheet = true }
                    }
                )
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(DesignTokens.base.bg)
            }
        }
        .sheet(item: $groupExpenseDetail) { expense in
            GroupExpenseDetailSheet(expense: expense) {
                groupExpenseDetail = nil
            }
        }
        .sheet(isPresented: $showGroupCreateMoment) {
            GroupCreateMomentView(
                preset: nil,
                sheetId: 2,
                isSubmitting: groupCreateMomentSubmitting,
                accent: DesignTokens.theme(for: .group).accent,
                onCancel: { showGroupCreateMoment = false },
                onCreate: { body in Task { await submitGroupMomentCreate(body: body) } }
            )
        }
        .task(id: selectedContext) {
            await viewModel.refresh(for: selectedContext, auth: auth)
        }
        .onAppear {
            seedContextFromProfileIfNeeded()
            momentraTheme.select(selectedContext)
        }
        .onChange(of: selectedContext) { newContext in
            momentraTheme.select(newContext)
        }
        .onReceive(auth.$meProfile) { _ in
            seedContextFromProfileIfNeeded()
        }
    }

    private var profileContext: MomentraContext? {
        switch auth.meProfile?.primaryFocus {
        case .personal:
            return .personal
        case .group:
            return .group
        case .business:
            return .business
        case nil:
            return nil
        }
    }

    private func seedContextFromProfileIfNeeded() {
        guard !seededContextFromProfile, let profileContext else { return }
        seededContextFromProfile = true
        selectedContext = profileContext
        momentraTheme.select(profileContext)
    }

    private func openGroupMomentFromPlan(moment: GroupMomentOut) async {
        await viewModel.loadSelectedGroupMomentDetail(momentId: moment.id, auth: auth)
        if viewModel.selectedGroupDetail?.moment.id == moment.id {
            showGroupMomentDetail = true
        }
    }

    private func submitGroupMomentCreate(body: GroupMomentCreateIn) async {
        guard let token = auth.getAccessToken() else {
            viewModel.errorMessage = "Unauthorized session"
            return
        }
        groupCreateMomentSubmitting = true
        viewModel.errorMessage = nil
        defer { groupCreateMomentSubmitting = false }
        do {
            let created = try await NetworkService.shared.createGroupMoment(body: body, token: token)
            showGroupCreateMoment = false
            await viewModel.loadSelectedGroupMomentDetail(momentId: created.id, auth: auth)
            await viewModel.refresh(for: .group, auth: auth)
        } catch {
            viewModel.errorMessage = error.localizedDescription
        }
    }

    private func submitPersonalMomentCreate(body: PersonalMomentCreateIn) async {
        guard let token = auth.getAccessToken() else {
            viewModel.errorMessage = "Unauthorized session"
            return
        }
        personalCreateMomentSubmitting = true
        viewModel.errorMessage = nil
        defer { personalCreateMomentSubmitting = false }
        do {
            _ = try await NetworkService.shared.createPersonalMoment(body: body, token: token)
            showPersonalCreateMoment = false
            await viewModel.refresh(for: .personal, auth: auth)
        } catch {
            viewModel.errorMessage = error.localizedDescription
        }
    }
}

struct ContextSwitcher: View {
    @Binding var selectedContext: MomentraContext

    var body: some View {
        MomentraContextTabs(selectedContext: selectedContext) { ctx in
            withAnimation(.easeInOut(duration: MomentraAnim.normal)) {
                selectedContext = ctx
            }
        }
    }
}

/// Menu picker shown under the context switcher when **Group** is active.
struct GroupMomentPickerBar: View {
    @ObservedObject var viewModel: MainShellViewModel
    @ObservedObject var auth: AuthManager

    var body: some View {
        HStack(spacing: 12) {
            Text("Moment")
                .font(.caption.weight(.semibold))
                .foregroundColor(MomentraBase.onDark60)
            Picker(
                "Group moment",
                selection: Binding(
                    get: { viewModel.selectedGroupMomentId },
                    set: { newId in
                        guard newId != viewModel.selectedGroupMomentId else { return }
                        Task { await viewModel.loadSelectedGroupMomentDetail(momentId: newId, auth: auth) }
                    }
                )
            ) {
                ForEach(viewModel.groupMoments) { g in
                    Text(g.title).tag(g.id)
                }
            }
            .pickerStyle(.menu)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
}

struct BottomNavBar: View {
    @Binding var selectedTab: MainTab
    var context: MomentraContext

    private var theme: ContextTheme { ContextTheme.theme(for: context) }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(MainTab.allCases) { tab in
                Button { selectedTab = tab } label: {
                    VStack(spacing: 3) {
                        Image(systemName: tab.icon(for: context)).font(.system(size: 16, weight: .semibold))
                        Text(tab.title(for: context)).font(DesignTokens.type.label)
                    }
                    .foregroundColor(selectedTab == tab ? theme.accent : theme.tabDim)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
                .buttonStyle(MomentraPressButtonStyle())
            }
        }
        .padding(.horizontal, 6)
        .background(MomentraBase.s100.opacity(0.94), in: RoundedRectangle(cornerRadius: DesignTokens.radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radius.card)
                .stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5)
        )
    }
}

struct FloatingAddButton: View {
    var context: MomentraContext
    let onTap: () -> Void

    private var theme: ContextTheme { ContextTheme.theme(for: context) }

    var body: some View {
        Button(action: onTap) {
            Label("Add", systemImage: "plus")
                .font(DesignTokens.type.titleSM)
                .foregroundColor(MomentraSemantic.ctaText)
                .padding(.vertical, 12)
                .padding(.horizontal, 22)
                .background(
                    LinearGradient(
                        colors: [theme.accent, theme.accentEnd],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: Capsule()
                )
        }
        .buttonStyle(MomentraPressButtonStyle())
    }
}

struct TabContentView: View {
    let context: MomentraContext
    let tab: MainTab
    @ObservedObject var viewModel: MainShellViewModel
    @ObservedObject var auth: AuthManager
    var onSelectPersonalMoment: (PersonalMomentItemOut) -> Void = { _ in }
    var onSelectPersonalTransaction: (PersonalTransactionOut) -> Void = { _ in }
    var onOpenPersonalCreateMoment: () -> Void = {}
    var onOpenAddSheet: () -> Void = {}
    var onGroupPlanMomentTap: (GroupMomentOut) -> Void = { _ in }
    var onSelectGroupExpense: (GroupExpenseOut) -> Void = { _ in }
    var onOpenGroupCreateMoment: () -> Void = {}

    var body: some View {
        Group {
            switch tab {
            case .today:
                TodayRouter(
                    context: context,
                    viewModel: viewModel,
                    onSelectPersonalTransaction: onSelectPersonalTransaction,
                    onOpenPersonalCreateMoment: onOpenPersonalCreateMoment,
                    onOpenAddSheet: onOpenAddSheet,
                    onSelectGroupExpense: onSelectGroupExpense,
                    onOpenGroupCreateMoment: onOpenGroupCreateMoment
                )
            case .plan:
                PlanRouter(
                    context: context,
                    viewModel: viewModel,
                    onSelectPersonalMoment: onSelectPersonalMoment,
                    onGroupPlanMomentTap: onGroupPlanMomentTap
                )
            case .activity:
                ActivityRouter(
                    context: context,
                    viewModel: viewModel,
                    onSelectPersonalTransaction: onSelectPersonalTransaction,
                    onSelectGroupExpense: onSelectGroupExpense
                )
            case .people: PeopleRouter(context: context, viewModel: viewModel)
            case .me: MeView(context: context, auth: auth, viewModel: viewModel)
            }
        }
        .padding(DesignTokens.spacing.screenV)
    }
}

struct TodayRouter: View {
    let context: MomentraContext
    @ObservedObject var viewModel: MainShellViewModel
    var onSelectPersonalTransaction: (PersonalTransactionOut) -> Void = { _ in }
    var onOpenPersonalCreateMoment: () -> Void = {}
    var onOpenAddSheet: () -> Void = {}
    var onSelectGroupExpense: (GroupExpenseOut) -> Void = { _ in }
    var onOpenGroupCreateMoment: () -> Void = {}

    var body: some View {
        switch context {
        case .personal:
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.spacing.section) {
                    Text("Personal · Today")
                        .font(DesignTokens.type.titleXL)
                    if let err = viewModel.errorMessage, !err.isEmpty {
                        Text(err)
                            .font(DesignTokens.type.caption)
                            .foregroundColor(DesignTokens.urgency.highText)
                    }
                    let spend = viewModel.personalTodaySpendTotal
                    let income = viewModel.personalTodayIncomeTotal
                    let net = income - spend
                    let theme = DesignTokens.theme(for: .personal)
                    HStack(spacing: 10) {
                        PersonalTodayKpiCell(title: "Spend", value: DesignTokens.formatInr(spend), accent: MomentraBase.onDark)
                        PersonalTodayKpiCell(title: "Income", value: DesignTokens.formatInr(income), accent: DesignTokens.urgency.cta)
                        PersonalTodayKpiCell(title: "Net", value: DesignTokens.formatInr(net), accent: net >= 0 ? DesignTokens.urgency.cta : DesignTokens.urgency.high)
                    }
                    HStack(spacing: 10) {
                        MomentraActionButton(
                            label: "New moment",
                            systemImage: "target",
                            actionStyle: DesignTokens.actionStyle(context: .personal, status: nil),
                            action: onOpenPersonalCreateMoment
                        )
                        MomentraActionButton(
                            label: "Add txn",
                            systemImage: "plus.circle",
                            actionStyle: DesignTokens.actionStyle(context: .personal, status: nil),
                            variant: .secondary,
                            secondaryText: theme.text,
                            action: onOpenAddSheet
                        )
                    }
                    Text("Today’s ledger")
                        .font(DesignTokens.type.bodyMedium)
                    let todayTx = viewModel.personalTransactionsToday
                    if todayTx.isEmpty {
                        ShellEmptyHint(text: "No transactions dated today. Use Add to log income or expense, or open Plan for your goals.")
                    } else {
                        ForEach(todayTx) { t in
                            Button {
                                onSelectPersonalTransaction(t)
                            } label: {
                                PersonalTodayTransactionRow(transaction: t)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    Text("Goals and moments live on Plan — use New moment above or the + button.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    Text("Loaded \(viewModel.personalRecentTransactions.count) ledger rows for Activity and Insights.")
                        .font(DesignTokens.type.micro)
                        .foregroundColor(MomentraBase.onDark40)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .group:
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.spacing.section) {
                    Text("Group · Today")
                        .font(DesignTokens.type.titleXL)
                    if let err = viewModel.errorMessage, !err.isEmpty {
                        Text(err)
                            .font(DesignTokens.type.caption)
                            .foregroundColor(DesignTokens.urgency.highText)
                    }
                    Text("Uses the moment selected in the bar above. Open Plan for all moments.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    let gTheme = DesignTokens.theme(for: .group)
                    if viewModel.groupMoments.isEmpty {
                        ShellEmptyHint(text: "No group moments yet. Create one with New group Moment or the + menu.")
                    } else if viewModel.selectedGroupDetail == nil {
                        ShellEmptyHint(text: "Loading this moment… switch picker or pull to refresh from Me.")
                    } else {
                        let count = viewModel.groupTodayExpenseCount
                        let total = viewModel.groupTodayExpenseTotal
                        HStack(spacing: DesignTokens.spacing.item) {
                            GroupTodayKpiCell(
                                theme: gTheme,
                                title: "Today",
                                value: "\(count) expense\(count == 1 ? "" : "s")",
                                valueColor: DesignTokens.base.onDark,
                                emphasizeAccent: true
                            )
                            GroupTodayKpiCell(
                                theme: gTheme,
                                title: "Spend",
                                value: DesignTokens.formatInr(total),
                                valueColor: DesignTokens.base.onDark
                            )
                        }
                        HStack(spacing: DesignTokens.spacing.item) {
                            MomentraActionButton(
                                label: "New group",
                                systemImage: "person.3",
                                actionStyle: DesignTokens.actionStyle(context: .group, status: nil),
                                action: onOpenGroupCreateMoment
                            )
                            MomentraActionButton(
                                label: "Add expense",
                                systemImage: "plus.circle",
                                actionStyle: DesignTokens.actionStyle(context: .group, status: nil),
                                variant: .secondary,
                                secondaryText: gTheme.text,
                                action: onOpenAddSheet
                            )
                        }
                        Text("Today’s shared expenses")
                            .font(DesignTokens.type.label)
                            .foregroundColor(MomentraBase.onDark40)
                            .tracking(0.4)
                        let todayEx = viewModel.groupExpensesToday
                        if todayEx.isEmpty {
                            ShellEmptyHint(text: "Nothing dated today for this moment. Activity shows the full ledger.")
                        } else {
                            VStack(alignment: .leading, spacing: DesignTokens.spacing.inline) {
                                ForEach(todayEx) { e in
                                    Button {
                                        onSelectGroupExpense(e)
                                    } label: {
                                        GroupExpenseLedgerRow(expense: e, theme: gTheme)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .business:
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.spacing.section) {
                    Text("Business · Today")
                        .font(DesignTokens.type.titleXL)
                    Text("Budgets: \(viewModel.businessBudgetsCount) · Workspaces: \(viewModel.businessWorkspaces.count)")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if !viewModel.businessBudgets.isEmpty {
                        ForEach(viewModel.businessBudgets.prefix(6), id: \.id) { b in
                            Text(b.budgetName)
                                .font(DesignTokens.type.bodyMedium)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .shellListRowChrome()
                        }
                    }
                    if let w = viewModel.businessWorkspaces.first {
                        Text("Workspace: \(w.title)")
                            .font(DesignTokens.type.micro)
                            .foregroundColor(MomentraBase.onDark40)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .circle:
            VStack(alignment: .leading, spacing: DesignTokens.spacing.item) {
                Text("Circle · Today")
                    .font(DesignTokens.type.titleXL)
                Text("Social updates and challenges (stored as signals until Circle API ships).")
                    .font(DesignTokens.type.caption)
                    .foregroundColor(MomentraBase.onDark60)
                Text("Circle activity count: \(viewModel.circleSignalsCount)")
                    .font(DesignTokens.type.caption)
                    .foregroundColor(MomentraBase.onDark)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct PlanRouter: View {
    let context: MomentraContext
    @ObservedObject var viewModel: MainShellViewModel
    var onSelectPersonalMoment: (PersonalMomentItemOut) -> Void = { _ in }
    var onGroupPlanMomentTap: (GroupMomentOut) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.spacing.screenV) {
                Text("\(context.displayName) · Plan")
                    .font(DesignTokens.type.titleXL)

                switch context {
                case .personal:
                    Text("Moments, horizons, and targets you are steering toward.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if viewModel.personalMoments.isEmpty {
                        ShellEmptyHint(text: "Create a personal moment from Add, or open Today to see what loaded.")
                    } else {
                        ForEach(viewModel.personalMoments) { m in
                            PersonalMomentGoalCardView(
                                title: m.title,
                                momentType: m.momentType,
                                targetAmount: m.targetAmount,
                                durationType: m.durationType,
                                endDate: m.endDate,
                                status: m.status,
                                savedAmount: m.savedAmount,
                                theme: DesignTokens.theme(for: .personal),
                                onTap: { onSelectPersonalMoment(m) }
                            )
                        }
                    }

                case .group:
                    VStack(alignment: .leading, spacing: DesignTokens.spacing.screenV) {
                        Text("Date windows, contribution deadlines, and shared goals.")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                        if viewModel.groupMoments.isEmpty {
                            ShellEmptyHint(text: "No group moments yet. Create one from Add or join via invite.")
                        } else {
                            VStack(alignment: .leading, spacing: DesignTokens.spacing.section) {
                                ForEach(viewModel.groupMoments) { g in
                                    Button {
                                        onGroupPlanMomentTap(g)
                                    } label: {
                                        GroupPlanMomentCardView(moment: g, theme: DesignTokens.theme(for: .group))
                                    }
                                    .buttonStyle(MomentraPressButtonStyle())
                                }
                            }
                        }
                    }
                    .padding(DesignTokens.spacing.cardH)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        DesignTokens.theme(for: .group).cover.opacity(0.22),
                        in: RoundedRectangle(cornerRadius: DesignTokens.radius.hero)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.radius.hero)
                            .stroke(DesignTokens.theme(for: .group).accent.opacity(0.16), lineWidth: 0.5)
                    )

                case .business:
                    Text("Budget periods, workspaces, and where spend is allocated.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if viewModel.businessBudgets.isEmpty, viewModel.businessWorkspaces.isEmpty {
                        ShellEmptyHint(text: "No business budgets or workspaces loaded yet.")
                    } else {
                        if !viewModel.businessWorkspaces.isEmpty {
                            Text("Workspaces")
                                .font(DesignTokens.type.bodyMedium)
                            ForEach(viewModel.businessWorkspaces) { w in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(w.title).font(DesignTokens.type.titleSM)
                                    Text("\(w.businessType) · \(w.currency)")
                                        .font(DesignTokens.type.caption)
                                        .foregroundColor(MomentraBase.onDark60)
                                }
                                .shellListRowChrome()
                            }
                        }
                        if !viewModel.businessWorkspaceUnits.isEmpty {
                            Text("Units")
                                .font(DesignTokens.type.bodyMedium)
                                .padding(.top, 4)
                            ForEach(viewModel.businessWorkspaceUnits) { u in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(u.name).font(DesignTokens.type.bodyMedium)
                                        Text(u.unitType).font(DesignTokens.type.caption).foregroundColor(MomentraBase.onDark60)
                                    }
                                    Spacer()
                                    Text(u.status).font(DesignTokens.type.micro).foregroundColor(MomentraBase.onDark40)
                                }
                                .shellListRowChrome(cornerRadius: DesignTokens.radius.cardSm, inset: 10)
                            }
                        }
                        if !viewModel.businessBudgets.isEmpty {
                            Text("Legacy budgets")
                                .font(DesignTokens.type.bodyMedium)
                                .padding(.top, 4)
                            ForEach(viewModel.businessBudgets, id: \.id) { b in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(b.budgetName).font(DesignTokens.type.titleSM)
                                    if let p = b.budgetPeriod, !p.isEmpty {
                                        Text("Period: \(p)").font(DesignTokens.type.caption).foregroundColor(MomentraBase.onDark60)
                                    }
                                    if let total = b.totalBudget {
                                        Text("Cap \(DesignTokens.formatInr(total))")
                                            .font(DesignTokens.type.caption)
                                            .foregroundColor(MomentraBase.onDark60)
                                    }
                                }
                                .shellListRowChrome()
                            }
                        }
                    }

                case .circle:
                    Text("Circle Plan is your space for challenges, asks, and updates you stage before a dedicated Circle API.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Use Add to log a challenge or contribution request.", systemImage: "sparkles")
                        Label("Activity lists recent Circle signals.", systemImage: "bubble.left.and.bubble.right")
                    }
                    .font(DesignTokens.type.caption)
                    .foregroundColor(MomentraBase.onDark60)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct ActivityRouter: View {
    let context: MomentraContext
    @ObservedObject var viewModel: MainShellViewModel
    var onSelectPersonalTransaction: (PersonalTransactionOut) -> Void = { _ in }
    var onSelectGroupExpense: (GroupExpenseOut) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.spacing.screenV) {
                Text("\(context.displayName) · Activity")
                    .font(DesignTokens.type.titleXL)

                switch context {
                case .personal:
                    Text("Ledger grouped by book date. Tap a row to edit or delete.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if viewModel.personalRecentTransactions.isEmpty {
                        ShellEmptyHint(text: "No transactions loaded. Add income or expense from the + sheet.")
                    } else {
                        ForEach(viewModel.personalActivitySections, id: \.day) { section in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(section.day.formatted(date: .abbreviated, time: .omitted))
                                    .font(DesignTokens.type.bodyMedium)
                                    .foregroundColor(MomentraBase.onDark60)
                                ForEach(section.transactions) { t in
                                    Button {
                                        onSelectPersonalTransaction(t)
                                    } label: {
                                        PersonalTodayTransactionRow(transaction: t)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                case .group:
                    Text("Shared expenses for the selected moment, grouped by date. Tap a row for details.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if let detail = viewModel.selectedGroupDetail {
                        if detail.expenses.isEmpty {
                            ShellEmptyHint(text: "No expenses logged yet for this moment.")
                        } else {
                            VStack(alignment: .leading, spacing: DesignTokens.spacing.section) {
                                ForEach(viewModel.groupExpenseSections, id: \.dayKey) { section in
                                    VStack(alignment: .leading, spacing: DesignTokens.spacing.inline) {
                                        Text(sectionHeaderLabel(forDayKey: section.dayKey).uppercased())
                                            .font(DesignTokens.type.label)
                                            .foregroundColor(MomentraBase.onDark40)
                                            .tracking(0.4)
                                        ForEach(section.expenses) { e in
                                            Button {
                                                onSelectGroupExpense(e)
                                            } label: {
                                                GroupExpenseLedgerRow(expense: e, theme: DesignTokens.theme(for: .group))
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        ShellEmptyHint(text: "Open Group context and ensure you have at least one group moment.")
                    }

                case .business:
                    Text("Approvals and vendor surface from the primary budget.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if let budget = viewModel.businessBudgets.first {
                        let pending = budget.pendingApprovals ?? []
                        if pending.isEmpty {
                            Text("No pending approvals.")
                                .font(DesignTokens.type.caption)
                                .foregroundColor(MomentraBase.onDark60)
                        } else {
                            Text("Pending approvals")
                                .font(DesignTokens.type.bodyMedium)
                            ForEach(pending) { a in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(a.status.capitalized).font(DesignTokens.type.bodyMedium)
                                        Text(a.receiptAttached ? "Receipt attached" : "No receipt")
                                            .font(DesignTokens.type.caption)
                                            .foregroundColor(MomentraBase.onDark60)
                                    }
                                    Spacer()
                                }
                                .shellListRowChrome(cornerRadius: DesignTokens.radius.cardSm, inset: 10)
                            }
                        }
                        let vendors = budget.vendors ?? []
                        if !vendors.isEmpty {
                            Text("Vendors (\(vendors.count))")
                                .font(DesignTokens.type.bodyMedium)
                                .padding(.top, 8)
                            ForEach(vendors.prefix(12)) { v in
                                Text(v.vendorName)
                                    .font(DesignTokens.type.caption)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 6)
                            }
                        }
                    } else {
                        ShellEmptyHint(text: "No business budget loaded.")
                    }

                case .circle:
                    Text("Circle posts you created (stored as personal signals).")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if viewModel.circleSignals.isEmpty {
                        ShellEmptyHint(text: "Nothing yet. Share an update or challenge from Add.")
                    } else {
                        ForEach(viewModel.circleSignals) { s in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(s.signalType.replacingOccurrences(of: "_", with: " "))
                                        .font(DesignTokens.type.micro)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(MomentraBase.s200, in: Capsule())
                                        .overlay(Capsule().stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5))
                                    Spacer()
                                    if let d = s.createdAt {
                                        Text(d).font(DesignTokens.type.nano).foregroundColor(MomentraBase.onDark40)
                                    }
                                }
                                Text(s.message)
                                    .font(DesignTokens.type.caption)
                                    .foregroundColor(MomentraBase.onDark)
                                Text("Severity: \(s.severity)")
                                    .font(DesignTokens.type.nano)
                                    .foregroundColor(MomentraBase.onDark40)
                            }
                            .shellListRowChrome()
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private func sectionHeaderLabel(forDayKey key: String) -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone.current
    let parts = key.split(separator: "-")
    guard parts.count == 3,
          let y = Int(parts[0]),
          let mo = Int(parts[1]),
          let d = Int(parts[2]),
          let date = cal.date(from: DateComponents(year: y, month: mo, day: d))
    else {
        return key
    }
    let f = DateFormatter()
    f.calendar = Calendar.current
    f.locale = Locale.current
    f.dateStyle = .medium
    f.timeStyle = .none
    return f.string(from: date)
}

private func peopleTabTitle(for context: MomentraContext) -> String {
    if context == .personal {
        return "\(context.displayName) · Insights"
    }
    return "\(context.displayName) · People"
}

struct PeopleRouter: View {
    let context: MomentraContext
    @ObservedObject var viewModel: MainShellViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.spacing.screenV) {
                Text(peopleTabTitle(for: context))
                    .font(DesignTokens.type.titleXL)

                switch context {
                case .personal:
                    Text("Expense totals by category from your loaded ledger (same data as Activity).")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if viewModel.personalSpendByCategory.isEmpty {
                        ShellEmptyHint(text: "No expense rows yet, or only income in the loaded window. Log spend from Add or Today.")
                    } else {
                        ForEach(viewModel.personalSpendByCategory, id: \.category) { row in
                            HStack {
                                Text(row.category)
                                    .font(DesignTokens.type.titleSM)
                                Spacer()
                                Text(DesignTokens.formatInr(row.total))
                                    .font(DesignTokens.type.bodyMedium)
                            }
                            .shellListRowChrome()
                        }
                    }

                case .group:
                    Text("Members and roles for the selected group moment.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if let members = viewModel.selectedGroupDetail?.members, !members.isEmpty {
                        ForEach(members) { m in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(m.displayName ?? m.email ?? "Member")
                                    .font(DesignTokens.type.titleSM)
                                HStack(spacing: 8) {
                                    Text(m.role).font(DesignTokens.type.caption).foregroundColor(MomentraBase.onDark60)
                                    Text("·")
                                        .foregroundColor(MomentraBase.onDark40)
                                    Text(m.status).font(DesignTokens.type.caption).foregroundColor(MomentraBase.onDark60)
                                    if m.paid {
                                        Text("Paid")
                                            .font(DesignTokens.type.nano)
                                            .foregroundColor(DesignTokens.urgency.paidText)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(DesignTokens.urgency.paidBg, in: Capsule())
                                    }
                                }
                                Text("Expected \(DesignTokens.formatInr(m.expectedShare)) · contributed \(DesignTokens.formatInr(m.contributedTotal))")
                                    .font(DesignTokens.type.nano)
                                    .foregroundColor(MomentraBase.onDark40)
                            }
                            .shellListRowChrome()
                        }
                    } else {
                        ShellEmptyHint(text: "No members loaded. Create or join a group moment first.")
                    }

                case .business:
                    Text("Team on the first business budget.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if let team = viewModel.businessBudgets.first?.teamMembers, !team.isEmpty {
                        ForEach(team) { m in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(m.displayName).font(DesignTokens.type.titleSM)
                                    Text(m.role).font(DesignTokens.type.caption).foregroundColor(MomentraBase.onDark60)
                                }
                                Spacer()
                            }
                            .shellListRowChrome()
                        }
                    } else {
                        ShellEmptyHint(text: "No team members on the loaded budget, or budgets failed to load.")
                    }

                case .circle:
                    Text("Circle is social-first. People you collaborate with will tie into Circle APIs later; for now, see Activity for signal threads.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    ShellEmptyHint(text: "Invite flows and follower lists are not wired in this shell yet.")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct MeView: View {
    let context: MomentraContext
    @ObservedObject var auth: AuthManager
    @ObservedObject var viewModel: MainShellViewModel
    @State private var signOutError: String?

    private var displayName: String {
        auth.meProfile?.displayName ?? auth.currentUser?.name ?? "You"
    }

    private var emailLine: String? {
        auth.meProfile?.email ?? auth.currentUser?.email
    }

    private var phoneLine: String? {
        auth.meProfile?.phoneNumber ?? auth.currentUser?.phoneNumber
    }

    var body: some View {
        let theme = DesignTokens.theme(for: context)
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Me")
                    .font(DesignTokens.type.titleXL)

                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(theme.accent.opacity(0.22))
                                .frame(width: 56, height: 56)
                            Text(String(displayName.prefix(1)).uppercased())
                                .font(DesignTokens.type.titleLG)
                                .foregroundColor(theme.accent)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(displayName)
                                .font(DesignTokens.type.titleMD)
                            if let email = emailLine {
                                Text(email)
                                    .font(DesignTokens.type.caption)
                                    .foregroundColor(MomentraBase.onDark60)
                            }
                        }
                    }
                    if let phone = phoneLine, !phone.isEmpty {
                        Label(phone, systemImage: "phone")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                    if let org = auth.meProfile?.organizationName, !org.isEmpty {
                        Label(org, systemImage: "building.2")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark)
                    }
                    if let cur = auth.meProfile?.defaultCurrency, !cur.isEmpty {
                        Label("Default \(cur)", systemImage: "dollarsign.circle")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(DesignTokens.spacing.screenV)
                .background(MomentraBase.s100, in: RoundedRectangle(cornerRadius: DesignTokens.radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.radius.card)
                        .stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5),
                )

                VStack(alignment: .leading, spacing: 10) {
                    Text("Shell")
                        .font(DesignTokens.type.bodyMedium)
                    Text("Active context: \(context.displayName)")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if viewModel.isLoading {
                        ProgressView()
                            .padding(.top, 4)
                    }
                    if let err = viewModel.errorMessage, !err.isEmpty {
                        Text(err)
                            .font(.footnote)
                            .foregroundColor(DesignTokens.urgency.highText)
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Profile (server)")
                        .font(DesignTokens.type.bodyMedium)
                    if let focus = auth.meProfile?.primaryFocus {
                        Text("Primary focus: \(focus.rawValue.capitalized)")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark)
                    } else {
                        Text("Primary focus: —")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                    if let setup = auth.meProfile?.setupCompleted {
                        Text(setup ? "Setup completed" : "Setup not marked complete")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                }

                Button {
                    signOutError = nil
                    do {
                        try auth.signOut()
                    } catch {
                        signOutError = error.localizedDescription
                    }
                } label: {
                    Text("Sign out")
                        .font(DesignTokens.type.label)
                        .foregroundColor(DesignTokens.urgency.highText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity)
                        .background(DesignTokens.urgency.highSurface.opacity(0.86))
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.radius.button)
                                .stroke(DesignTokens.urgency.high.opacity(0.45), lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.button))
                }
                .buttonStyle(MomentraPressButtonStyle())

                if let signOutError {
                    Text(signOutError)
                        .font(.footnote)
                        .foregroundColor(DesignTokens.urgency.highText)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .task {
            if auth.meProfile == nil {
                try? await auth.refreshMeProfile()
            }
        }
    }
}

// MARK: - Shell helpers

extension View {
    /// Theme Kit v2.2 — list row surface (`s100` + hairline on `s300`).
    func shellListRowChrome(
        cornerRadius: CGFloat = DesignTokens.radius.cardSm,
        inset: CGFloat = DesignTokens.spacing.section,
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius)
        return self
            .padding(inset)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MomentraBase.s100, in: shape)
            .overlay(shape.stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5))
    }
}

private struct PersonalTodayKpiCell: View {
    let title: String
    let value: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(DesignTokens.type.nano)
                .foregroundColor(MomentraBase.onDark40)
            Text(value)
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(MomentraBase.s100, in: RoundedRectangle(cornerRadius: DesignTokens.radius.cardSm))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radius.cardSm)
                .stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5)
        )
    }
}

private struct PersonalTodayTransactionRow: View {
    let transaction: PersonalTransactionOut

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.title).font(DesignTokens.type.titleSM)
                if !transaction.subtitle.isEmpty {
                    Text(transaction.subtitle)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                }
                if let cat = transaction.categoryIfNotRedundant {
                    Text(cat)
                        .font(DesignTokens.type.micro)
                        .foregroundColor(MomentraBase.onDark40)
                }
            }
            Spacer()
            Text(ShellFormatters.signedAmount(transaction.amount, isIncome: transaction.isIncome))
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(transaction.isIncome ? DesignTokens.urgency.cta : MomentraBase.onDark)
        }
        .shellListRowChrome()
    }
}

private struct ShellEmptyHint: View {
    let text: String

    var body: some View {
        Text(text)
            .font(DesignTokens.type.caption)
            .foregroundColor(MomentraBase.onDark60)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(DesignTokens.spacing.cardH)
            .background(MomentraBase.s200.opacity(0.55), in: RoundedRectangle(cornerRadius: DesignTokens.radius.cardSm))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.radius.cardSm)
                    .stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5)
            )
    }
}

enum ShellFormatters {
    static func momentDateLine(start: String?, end: String?) -> String? {
        switch (start, end) {
        case let (s?, e?) where !s.isEmpty && !e.isEmpty:
            return "\(s) – \(e)"
        case let (s?, _) where !s.isEmpty:
            return "Starts \(s)"
        case let (_, e?) where !e.isEmpty:
            return "Ends \(e)"
        default:
            return nil
        }
    }

    static func signedAmount(_ amount: Double, isIncome: Bool) -> String {
        let prefix = isIncome ? "+" : "−"
        return "\(prefix)\(DesignTokens.formatInr(abs(amount)))"
    }
}

private enum AddAction: String, Identifiable {
    case personalExpense, personalIncome, personalGoalContribution
    case groupSharedExpense, groupSettlement, groupInviteMember
    case businessSale, businessExpense, businessInvoice, businessUploadReceipt
    case circleShareUpdate, circleRequestContribution, circleStartChallenge
    var id: String { rawValue }
}

private struct PersonalGoalDTO: Codable, Identifiable {
    let goalId: String
    let title: String
    let targetAmount: Double
    let savedAmount: Double
    let targetDate: String?

    var id: String { goalId }

    enum CodingKeys: String, CodingKey {
        case goalId = "goal_id"
        case title
        case targetAmount = "target_amount"
        case savedAmount = "saved_amount"
        case targetDate = "target_date"
    }
}

private struct PersonalGoalCreateDTO: Codable {
    let title: String
    let targetAmount: Double
    let savedAmount: Double
    let targetDate: String?

    enum CodingKeys: String, CodingKey {
        case title
        case targetAmount = "target_amount"
        case savedAmount = "saved_amount"
        case targetDate = "target_date"
    }
}

private struct PersonalGoalUpdateDTO: Codable {
    let savedAmount: Double

    enum CodingKeys: String, CodingKey {
        case savedAmount = "saved_amount"
    }
}

private struct GroupSettlementCreateDTO: Codable {
    let fromParticipantId: String
    let toParticipantId: String
    let amount: Double
    let cycleId: String?

    enum CodingKeys: String, CodingKey {
        case fromParticipantId = "from_participant_id"
        case toParticipantId = "to_participant_id"
        case amount
        case cycleId = "cycle_id"
    }
}

private struct GroupSettlementOutDTO: Codable {
    let settlementId: String

    enum CodingKeys: String, CodingKey {
        case settlementId = "settlement_id"
    }
}

struct AddActionSheet: View {
    let context: MomentraContext
    @ObservedObject var auth: AuthManager
    @ObservedObject var viewModel: MainShellViewModel
    let onActionCompleted: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var activeAction: AddAction?
    @State private var statusMessage: String?
    @State private var isSubmitting = false
    @State private var amountInput = ""
    @State private var titleInput = ""
    @State private var categoryInput = "expense"
    @State private var emailInput = ""
    @State private var inviteJoinUrl: String = ""
    @State private var inviteLinkLoading: Bool = false
    @State private var inviteComposeMessage: String = "You've been invited to join a group moment on Momentra."
    @State private var inviteShowScanner: Bool = false
    @State private var settlementFromId = ""
    @State private var settlementToId = ""
    @State private var selectedBusinessUnitId = ""
    @State private var receiptBucket = "receipts"
    @State private var showReceiptImporter = false
    @State private var receiptPickURL: URL?
    @State private var receiptFileLabel: String?
    @State private var circleBody = ""
    @State private var circleRequestedAmount = ""

    /// Moment id for group Add actions; matches the shell **Moment** picker.
    private var focusedGroupMomentId: String {
        if !viewModel.selectedGroupMomentId.isEmpty { return viewModel.selectedGroupMomentId }
        return viewModel.groupMoments.first?.id ?? ""
    }

    private var sheetTheme: ContextTheme {
        DesignTokens.theme(for: context)
    }

    var body: some View {
        NavigationStack {
            if let activeAction {
                detail(for: activeAction)
            } else {
                List(actions, id: \.0.id) { action in
                    Button {
                        activeAction = action.0
                    } label: {
                        HStack {
                            Text(action.1)
                                .font(DesignTokens.type.bodyMedium)
                                .foregroundColor(DesignTokens.base.onDark)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(MomentraBase.onDark40)
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(sheetTheme.surface.opacity(0.55))
                    .listRowSeparatorTint(MomentraBase.s300.opacity(0.45))
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .navigationTitle("Add · \(context.displayName)")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Close") { dismiss() }
                            .foregroundColor(sheetTheme.accent)
                    }
                }
            }
        }
        .tint(sheetTheme.accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .background(DesignTokens.base.bg.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    private var actions: [(AddAction, String)] {
        switch context {
        case .personal: [(.personalExpense, "Add Expense"), (.personalIncome, "Add Income"), (.personalGoalContribution, "Add Goal Contribution")]
        case .group: [(.groupSharedExpense, "Add Shared Expense"), (.groupSettlement, "Add Settlement"), (.groupInviteMember, "Invite Member")]
        case .business: [(.businessSale, "Add Sale"), (.businessExpense, "Add Expense"), (.businessInvoice, "Create Invoice"), (.businessUploadReceipt, "Upload Receipt")]
        case .circle: [(.circleShareUpdate, "Share Update"), (.circleRequestContribution, "Request Contribution"), (.circleStartChallenge, "Start Challenge")]
        }
    }

    @ViewBuilder
    private func detail(for action: AddAction) -> some View {
        switch action {
        case .personalExpense: personalTxForm(isIncome: false, title: "Add Expense")
        case .personalIncome: personalTxForm(isIncome: true, title: "Add Income")
        case .personalGoalContribution: personalGoalContributionForm()
        case .groupSharedExpense: groupExpenseForm()
        case .groupSettlement: groupSettlementForm()
        case .groupInviteMember: groupInviteForm()
        case .businessExpense: businessExpenseForm()
        case .businessSale: businessWorkspaceSpendForm(spendType: "revenue", navTitle: "Add Sale")
        case .businessInvoice: businessWorkspaceSpendForm(spendType: "invoice", navTitle: "Create Invoice")
        case .businessUploadReceipt: businessReceiptUploadForm()
        case .circleShareUpdate: circleShareForm()
        case .circleRequestContribution: circleContributionForm()
        case .circleStartChallenge: circleChallengeForm()
        }
    }

    @ViewBuilder
    private func personalTxForm(isIncome: Bool, title: String) -> some View {
        Form {
            TextField("Title", text: $titleInput)
            TextField("Amount", text: $amountInput).keyboardType(.decimalPad)
            TextField("Category", text: $categoryInput)
            if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
        }
        .momentraFormSheetChrome()
        .navigationTitle(title)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") { activeAction = nil }
                    .foregroundColor(DesignTokens.base.onDark)
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Button("Save") { Task { await submitPersonal(isIncome: isIncome) } }
                        .foregroundColor(sheetTheme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func groupInviteForm() -> some View {
        Form {
            Section {
                if inviteLinkLoading {
                    ProgressView().tint(sheetTheme.accent)
                } else if inviteJoinUrl.isEmpty {
                    Text("Could not load invite link. Pick a moment above or try again.")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    Button("Retry") { Task { await loadGroupInviteLink() } }
                        .foregroundColor(sheetTheme.accent)
                } else {
                    InviteLinkQrView(urlString: inviteJoinUrl)
                        .frame(maxWidth: .infinity)
                    Text(inviteJoinUrl)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(DesignTokens.base.onDark)
                        .textSelection(.enabled)
                    if #available(iOS 16.0, *) {
                        ShareLink(item: inviteJoinUrl) {
                            Label("Share link…", systemImage: "square.and.arrow.up")
                                .foregroundColor(sheetTheme.accent)
                        }
                    }
                    Button {
                        inviteShowScanner = true
                    } label: {
                        Label("Scan invite QR", systemImage: "qrcode.viewfinder")
                            .foregroundColor(sheetTheme.accent)
                    }
                }
            } header: {
                Text("Invite link")
            } footer: {
                Text("Share this link or QR, or scan someone else’s invite to join their moment.")
                    .font(DesignTokens.type.micro)
                    .foregroundColor(MomentraBase.onDark40)
            }

            Section("Email (optional)") {
                TextField("Email", text: $emailInput).keyboardType(.emailAddress)
                TextField("Message", text: $inviteComposeMessage, axis: .vertical)
                    .lineLimit(3...6)
                if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
                if isSubmitting {
                    ProgressView().tint(sheetTheme.accent)
                } else {
                    Button("Send email invite") {
                        Task { await submitGroupInvite() }
                    }
                    .foregroundColor(sheetTheme.accent)
                    .disabled(emailInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .momentraFormSheetChrome()
        .navigationTitle("Invite people")
        .task(id: focusedGroupMomentId) {
            await loadGroupInviteLink()
        }
        .sheet(isPresented: $inviteShowScanner) {
            InviteQrScannerView(
                onCode: { code in
                    inviteShowScanner = false
                    Task { await joinGroupFromScannedCode(code) }
                },
                onCancel: { inviteShowScanner = false }
            )
            .ignoresSafeArea()
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") {
                    inviteJoinUrl = ""
                    activeAction = nil
                }
                .foregroundColor(DesignTokens.base.onDark)
            }
        }
    }

    private func loadGroupInviteLink() async {
        guard let token = auth.getAccessToken() else {
            inviteJoinUrl = ""
            return
        }
        guard !focusedGroupMomentId.isEmpty else {
            inviteJoinUrl = ""
            return
        }
        inviteLinkLoading = true
        defer { inviteLinkLoading = false }
        do {
            let out = try await NetworkService.shared.groupInviteLink(momentId: focusedGroupMomentId, token: token)
            inviteJoinUrl = out.joinUrl
        } catch {
            inviteJoinUrl = ""
            statusMessage = error.localizedDescription
        }
    }

    private func groupJoinToken(fromScanned raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed) else { return trimmed }
        let segs = url.path.split(separator: "/").map(String.init)
        if let idx = segs.firstIndex(of: "join"), idx + 1 < segs.count {
            return segs[idx + 1]
        }
        return segs.last ?? trimmed
    }

    private func joinGroupFromScannedCode(_ raw: String) async {
        guard let token = auth.getAccessToken() else {
            statusMessage = "Unauthorized session"
            return
        }
        let tok = groupJoinToken(fromScanned: raw)
        guard !tok.isEmpty else {
            statusMessage = "Invalid QR code"
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            _ = try await NetworkService.shared.joinGroupWithToken(rawToken: tok, token: token)
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    @ViewBuilder
    private func personalGoalContributionForm() -> some View {
        Form {
            TextField("Contribution amount", text: $amountInput)
                .keyboardType(.decimalPad)
            TextField("Goal title (if new goal needed)", text: $titleInput)
            if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
        }
        .momentraFormSheetChrome()
        .navigationTitle("Add Goal Contribution")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") { activeAction = nil }
                    .foregroundColor(DesignTokens.base.onDark)
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Button("Save") { Task { await submitGoalContribution() } }
                        .foregroundColor(sheetTheme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func groupSettlementForm() -> some View {
        if let detail = viewModel.selectedGroupDetail, !detail.members.isEmpty {
            let members = detail.members
            Form {
                Section {
                    Picker("From member", selection: $settlementFromId) {
                        ForEach(members, id: \.memberId) { member in
                            Text(member.displayName ?? member.email ?? "Member").tag(member.memberId)
                        }
                    }
                    Picker("To member", selection: $settlementToId) {
                        ForEach(members, id: \.memberId) { member in
                            Text(member.displayName ?? member.email ?? "Member").tag(member.memberId)
                        }
                    }
                    TextField("Amount", text: $amountInput)
                        .keyboardType(.decimalPad)
                    if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
                } header: {
                    Text("Settlement")
                } footer: {
                    Text("Records a transfer between two members on this moment. Pick two different people and a positive amount.")
                        .font(DesignTokens.type.micro)
                        .foregroundColor(MomentraBase.onDark40)
                }
            }
            .momentraFormSheetChrome()
            .onAppear {
                if settlementFromId.isEmpty { settlementFromId = members.first?.memberId ?? "" }
                if settlementToId.isEmpty { settlementToId = members.dropFirst().first?.memberId ?? members.first?.memberId ?? "" }
            }
            .navigationTitle("Add Settlement")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { activeAction = nil }
                        .foregroundColor(DesignTokens.base.onDark)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Submit") { Task { await submitGroupSettlement() } }
                            .foregroundColor(sheetTheme.accent)
                    }
                }
            }
        } else if viewModel.selectedGroupDetail == nil {
            Text("Load a group moment from the picker above, then open Add again to record a settlement.")
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(MomentraBase.onDark60)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .padding()
                .background(DesignTokens.base.bg)
        } else {
            Text("At least two joined members are required to record a settlement.")
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(MomentraBase.onDark60)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .padding()
                .background(DesignTokens.base.bg)
        }
    }

    @ViewBuilder
    private func groupExpenseForm() -> some View {
        if let detail = viewModel.selectedGroupDetail {
            let categories = detail.budgetCategories.map { ($0.categoryKey, $0.displayName) }
            let members = detail.members.map { ($0.memberId, $0.displayName ?? $0.email ?? "Member") }
            GroupExpenseSheetView(
                categories: categories,
                members: members,
                defaultPaidByMemberId: detail.members.first?.memberId,
                defaultCategoryKey: detail.budgetCategories.first?.categoryKey,
                sheetKey: 1,
                accent: DesignTokens.theme(for: .group).accent,
                isSubmitting: isSubmitting,
                onCancel: { activeAction = nil },
                onSubmit: { body, receiptURL in
                    Task { await submitGroupExpense(momentId: detail.moment.id, body: body, receiptFileURL: receiptURL) }
                }
            )
        } else {
            Text("No group available. Create or join one first, then pick a moment from the shell picker.")
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(MomentraBase.onDark60)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .padding()
                .background(DesignTokens.base.bg)
        }
    }

    @ViewBuilder
    private func businessExpenseForm() -> some View {
        if let budget = viewModel.businessBudgets.first {
            BusinessExpenseSheetView(
                categories: budget.categories,
                catalog: viewModel.firstBusinessCatalog,
                vendorOptions: (budget.vendors ?? []).map(\.vendorName),
                defaultKind: "expense",
                sheetKey: 1,
                accent: DesignTokens.theme(for: .business).accent,
                isSubmitting: isSubmitting,
                onCancel: { activeAction = nil },
                onSubmit: { body in Task { await submitBusinessExpense(budgetId: budget.id, body: body) } }
            )
        } else {
            Text("No business budget available. Create one first.")
        }
    }

    @ViewBuilder
    private func businessWorkspaceSpendForm(spendType: String, navTitle: String) -> some View {
        if let workspace = viewModel.businessWorkspaces.first, !viewModel.businessWorkspaceUnits.isEmpty {
            Form {
                Text(workspace.title)
                    .font(DesignTokens.type.caption)
                    .foregroundColor(MomentraBase.onDark60)
                Picker("Unit", selection: $selectedBusinessUnitId) {
                    ForEach(viewModel.businessWorkspaceUnits) { unit in
                        Text(unit.name).tag(unit.unitId)
                    }
                }
                TextField(spendType == "invoice" ? "Invoice title or number" : "Description", text: $titleInput)
                TextField("Amount", text: $amountInput)
                    .keyboardType(.decimalPad)
                if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
            }
            .momentraFormSheetChrome()
            .onAppear {
                if selectedBusinessUnitId.isEmpty, let first = viewModel.businessWorkspaceUnits.first {
                    selectedBusinessUnitId = first.unitId
                }
            }
            .navigationTitle(navTitle)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { activeAction = nil }
                        .foregroundColor(DesignTokens.base.onDark)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Submit") { Task { await submitWorkspaceSpend(workspaceId: workspace.workspaceId, spendType: spendType) } }
                            .foregroundColor(sheetTheme.accent)
                    }
                }
            }
        } else {
            Text("No business workspace or units yet. Create a workspace and at least one unit, then refresh.")
                .font(DesignTokens.type.caption)
                .foregroundColor(MomentraBase.onDark60)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .padding()
                .background(DesignTokens.base.bg)
        }
    }

    @ViewBuilder
    private func circleShareForm() -> some View {
        Form {
            TextEditor(text: $circleBody)
                .frame(minHeight: 120)
            if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
        }
        .momentraFormSheetChrome()
        .navigationTitle("Share Update")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") { activeAction = nil }
                    .foregroundColor(DesignTokens.base.onDark)
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Button("Post") { Task { await submitCircleSignal(signalType: "circle_update", message: circleBody) } }
                        .foregroundColor(sheetTheme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func circleContributionForm() -> some View {
        Form {
            TextField("Requested amount (optional)", text: $circleRequestedAmount)
                .keyboardType(.decimalPad)
            TextEditor(text: $circleBody)
                .frame(minHeight: 100)
            if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
        }
        .momentraFormSheetChrome()
        .navigationTitle("Request Contribution")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") { activeAction = nil }
                    .foregroundColor(DesignTokens.base.onDark)
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Button("Send") { Task { await submitCircleContributionRequest() } }
                        .foregroundColor(sheetTheme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func circleChallengeForm() -> some View {
        Form {
            TextField("Challenge name", text: $titleInput)
            TextEditor(text: $circleBody)
                .frame(minHeight: 100)
            if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
        }
        .momentraFormSheetChrome()
        .navigationTitle("Start Challenge")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") { activeAction = nil }
                    .foregroundColor(DesignTokens.base.onDark)
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Button("Create") { Task { await submitCircleChallenge() } }
                        .foregroundColor(sheetTheme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func businessReceiptUploadForm() -> some View {
        Form {
            TextField("Storage bucket", text: $receiptBucket)
            Button("Choose file") { showReceiptImporter = true }
            if let receiptFileLabel {
                Text("Selected: \(receiptFileLabel)")
                    .font(DesignTokens.type.caption)
                    .foregroundColor(MomentraBase.onDark60)
            }
            if let statusMessage { Text(statusMessage).foregroundColor(MomentraBase.onDark60) }
        }
        .momentraFormSheetChrome()
        .navigationTitle("Upload Receipt")
        .fileImporter(
            isPresented: $showReceiptImporter,
            allowedContentTypes: [.image, .pdf],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                receiptPickURL = urls.first
                receiptFileLabel = urls.first?.lastPathComponent
            case .failure(let err):
                statusMessage = err.localizedDescription
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Back") { activeAction = nil }
                    .foregroundColor(DesignTokens.base.onDark)
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Button("Upload") { Task { await submitReceiptUpload() } }
                        .foregroundColor(sheetTheme.accent)
                }
            }
        }
    }

    private func submitPersonal(isIncome: Bool) async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        guard let amount = Double(amountInput), amount > 0 else { statusMessage = "Enter valid amount"; return }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let body = PersonalTransactionCreateIn(
                isIncome: isIncome,
                amount: amount,
                category: categoryInput,
                subcategoryId: nil,
                subcategoryLabel: nil,
                accountId: nil,
                title: titleInput.isEmpty ? nil : titleInput,
                note: nil,
                txnDate: PersonalBookDateFormatting.yyyyMMdd()
            )
            let _: PersonalTransactionOut = try await NetworkService.shared.createPersonalTransaction(body: body, token: token)
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func submitGroupInvite() async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        guard !focusedGroupMomentId.isEmpty else { statusMessage = "No group moment selected"; return }
        guard !emailInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { statusMessage = "Email required"; return }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let msg = inviteComposeMessage.trimmingCharacters(in: .whitespacesAndNewlines)
            let body = GroupInviteEmailIn(
                emails: [emailInput],
                message: msg.isEmpty ? nil : msg,
                resend: false
            )
            let _ = try await NetworkService.shared.sendGroupInviteEmails(momentId: focusedGroupMomentId, body: body, token: token)
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func submitGroupExpense(momentId: String, body: GroupExpenseCreateIn, receiptFileURL: URL?) async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let detail = try await NetworkService.shared.createGroupExpense(momentId: momentId, body: body, token: token)
            if let fileURL = receiptFileURL,
               let expenseId = pickNewGroupExpenseId(from: detail, matching: body)
            {
                let accessed = fileURL.startAccessingSecurityScopedResource()
                defer {
                    if accessed { fileURL.stopAccessingSecurityScopedResource() }
                }
                do {
                    let data = try Data(contentsOf: fileURL)
                    let ext = fileURL.pathExtension.isEmpty ? "bin" : fileURL.pathExtension
                    let fileName = fileURL.lastPathComponent.isEmpty ? "receipt.\(ext)" : fileURL.lastPathComponent
                    let mime = mimeTypeForReceipt(pathExtension: ext)
                    _ = try await NetworkService.shared.uploadGroupExpenseReceipt(
                        momentId: momentId,
                        expenseId: expenseId,
                        fileData: data,
                        fileName: fileName,
                        mimeType: mime,
                        token: token
                    )
                } catch {
                    statusMessage = "Expense saved, but receipt upload failed: \(error.localizedDescription)"
                    onActionCompleted()
                    dismiss()
                    return
                }
            }
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func pickNewGroupExpenseId(from detail: GroupMomentDetailOut, matching body: GroupExpenseCreateIn) -> String? {
        let matches = detail.expenses.filter {
            $0.title == body.title
                && abs($0.amount - body.amount) < 0.0001
                && $0.expenseDate == body.expenseDate
        }
        if matches.count == 1 { return matches.first?.expenseId }
        return matches.max(by: { ($0.createdAt ?? "") < ($1.createdAt ?? "") })?.expenseId
            ?? detail.expenses.max(by: { ($0.createdAt ?? "") < ($1.createdAt ?? "") })?.expenseId
    }

    private func submitBusinessExpense(budgetId: String, body: BusinessExpenseCreateIn) async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let _ = try await NetworkService.shared.createBusinessExpense(budgetId: budgetId, body: body, token: token)
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func submitWorkspaceSpend(workspaceId: String, spendType: String) async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        guard !selectedBusinessUnitId.isEmpty else { statusMessage = "Select a unit"; return }
        guard let amount = Double(amountInput.trimmingCharacters(in: .whitespacesAndNewlines)), amount > 0 else {
            statusMessage = "Enter a valid amount"
            return
        }
        let trimmedTitle = titleInput.trimmingCharacters(in: .whitespacesAndNewlines)
        let title = trimmedTitle.isEmpty
            ? (spendType == "invoice" ? "Invoice" : "Sale")
            : trimmedTitle
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let body = BusinessWorkspaceSpendCreateIn(
                unitId: selectedBusinessUnitId,
                title: title,
                amount: amount,
                spendType: spendType
            )
            let _ = try await NetworkService.shared.createBusinessWorkspaceSpend(
                workspaceId: workspaceId,
                body: body,
                token: token
            )
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func submitReceiptUpload() async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        guard let url = receiptPickURL else { statusMessage = "Choose a file first"; return }
        let bucket = receiptBucket.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !bucket.isEmpty else { statusMessage = "Enter a bucket name"; return }
        let uid = auth.firebaseUid ?? "user"
        let ext = url.pathExtension.isEmpty ? "bin" : url.pathExtension
        let objectPath = "\(uid)/receipts/\(UUID().uuidString).\(ext)"
        isSubmitting = true
        defer { isSubmitting = false }
        let accessed = url.startAccessingSecurityScopedResource()
        defer {
            if accessed { url.stopAccessingSecurityScopedResource() }
        }
        do {
            let data = try Data(contentsOf: url)
            let mime = mimeTypeForReceipt(pathExtension: url.pathExtension)
            let fileName = url.lastPathComponent.isEmpty ? "receipt.\(ext)" : url.lastPathComponent
            let _ = try await NetworkService.shared.uploadStorageObject(
                bucket: bucket,
                objectPath: objectPath,
                fileData: data,
                fileName: fileName,
                mimeType: mime,
                token: token
            )
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func mimeTypeForReceipt(pathExtension ext: String) -> String {
        switch ext.lowercased() {
        case "jpg", "jpeg": return "image/jpeg"
        case "png": return "image/png"
        case "heic": return "image/heic"
        case "pdf": return "application/pdf"
        case "webp": return "image/webp"
        default: return "application/octet-stream"
        }
    }

    private func submitCircleSignal(signalType: String, message: String) async {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { statusMessage = "Enter a message"; return }
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let body = PersonalSignalCreateIn(signalType: signalType, severity: "info", message: trimmed)
            let _: PersonalSignalOut = try await NetworkService.shared.request(
                endpoint: "/personal/signals",
                method: "POST",
                body: body,
                token: token
            )
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func submitCircleContributionRequest() async {
        let note = circleBody.trimmingCharacters(in: .whitespacesAndNewlines)
        let amt = circleRequestedAmount.trimmingCharacters(in: .whitespacesAndNewlines)
        var parts: [String] = []
        if !amt.isEmpty { parts.append("Requested amount: \(amt)") }
        if !note.isEmpty { parts.append(note) }
        let message = parts.joined(separator: "\n")
        await submitCircleSignal(signalType: "circle_contribution_request", message: message.isEmpty ? "Contribution request" : message)
    }

    private func submitCircleChallenge() async {
        let name = titleInput.trimmingCharacters(in: .whitespacesAndNewlines)
        let details = circleBody.trimmingCharacters(in: .whitespacesAndNewlines)
        let message: String
        if name.isEmpty, details.isEmpty {
            message = ""
        } else if name.isEmpty {
            message = details
        } else if details.isEmpty {
            message = "Challenge: \(name)"
        } else {
            message = "Challenge: \(name)\n\(details)"
        }
        await submitCircleSignal(signalType: "circle_challenge", message: message)
    }

    private func submitGoalContribution() async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        guard let contribution = Double(amountInput.trimmingCharacters(in: .whitespacesAndNewlines)), contribution > 0 else {
            statusMessage = "Enter valid contribution amount"
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let goals: [PersonalGoalDTO] = try await NetworkService.shared.request(
                endpoint: "/personal/goals",
                method: "GET",
                token: token
            )

            if let firstGoal = goals.first {
                let update = PersonalGoalUpdateDTO(savedAmount: firstGoal.savedAmount + contribution)
                let _: PersonalGoalDTO = try await NetworkService.shared.request(
                    endpoint: "/personal/goals/\(firstGoal.id)",
                    method: "PATCH",
                    body: update,
                    token: token
                )
            } else {
                let title = titleInput.trimmingCharacters(in: .whitespacesAndNewlines)
                let create = PersonalGoalCreateDTO(
                    title: title.isEmpty ? "My Goal" : title,
                    targetAmount: contribution,
                    savedAmount: contribution,
                    targetDate: nil
                )
                let _: PersonalGoalDTO = try await NetworkService.shared.request(
                    endpoint: "/personal/goals",
                    method: "POST",
                    body: create,
                    token: token
                )
            }

            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func submitGroupSettlement() async {
        guard let token = auth.getAccessToken() else { statusMessage = "Unauthorized session"; return }
        guard !focusedGroupMomentId.isEmpty else { statusMessage = "No group moment selected"; return }
        guard !settlementFromId.isEmpty, !settlementToId.isEmpty else {
            statusMessage = "Choose both members"
            return
        }
        guard settlementFromId != settlementToId else {
            statusMessage = "From and To must be different people"
            return
        }
        guard let amount = Double(amountInput.trimmingCharacters(in: .whitespacesAndNewlines)), amount > 0 else {
            statusMessage = "Enter an amount greater than zero"
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let body = GroupSettlementCreateDTO(
                fromParticipantId: settlementFromId,
                toParticipantId: settlementToId,
                amount: amount,
                cycleId: nil
            )
            let _: GroupSettlementOutDTO = try await NetworkService.shared.request(
                endpoint: "/group/moments/\(focusedGroupMomentId)/settlements",
                method: "POST",
                body: body,
                token: token
            )
            onActionCompleted()
            dismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
