import SwiftUI

// MARK: - Group ledger row (Today / Activity)

struct GroupExpenseLedgerRow: View {
    let expense: GroupExpenseOut
    var theme: ContextTheme = ContextTheme.theme(for: .group)

    var body: some View {
        HStack(alignment: .top, spacing: DesignTokens.spacing.item) {
            VStack(alignment: .leading, spacing: DesignTokens.spacing.xs) {
                Text(expense.title)
                    .font(DesignTokens.type.titleSM)
                    .foregroundColor(DesignTokens.base.onDark)
                HStack(spacing: DesignTokens.spacing.xs) {
                    Text(expense.expenseDate)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                    if let payer = expense.paidByName, !payer.isEmpty {
                        Text("· \(payer)")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                }
                Text(expense.categoryKey)
                    .font(DesignTokens.type.micro)
                    .foregroundColor(theme.text.opacity(0.72))
            }
            Spacer(minLength: 0)
            Text(DesignTokens.formatInr(expense.amount))
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(DesignTokens.base.onDark)
        }
        .shellListRowChrome(cornerRadius: DesignTokens.radius.cardSm, inset: DesignTokens.spacing.cardH)
    }
}

/// Theme Kit v2.2 `.urg-chip` density — KPI strip for Group Today.
struct GroupTodayKpiCell: View {
    let theme: ContextTheme
    let title: String
    let value: String
    let valueColor: Color
    /// When true, draws the kit-style accent hairline (`.urg-chip` border feel).
    var emphasizeAccent: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacing.xs) {
            Text(title.uppercased())
                .font(DesignTokens.type.label)
                .foregroundColor(MomentraBase.onDark40)
                .tracking(0.4)
            Text(value)
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(valueColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, DesignTokens.spacing.cardH)
        .padding(.vertical, DesignTokens.spacing.section)
        .background(theme.surface, in: RoundedRectangle(cornerRadius: DesignTokens.radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radius.card)
                .stroke(
                    emphasizeAccent ? theme.accent.opacity(0.38) : MomentraBase.s300.opacity(0.5),
                    lineWidth: emphasizeAccent ? 1 : 0.5
                )
        )
    }
}

/// Theme Kit v2.2 `.mc` moment row — Plan list for group moments (orb + surface + 16pt radius).
struct GroupPlanMomentCardView: View {
    let moment: GroupMomentOut
    let theme: ContextTheme

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Circle()
                .fill(theme.accent.opacity(theme.orbOpacity))
                .frame(width: 88, height: 88)
                .offset(x: 10, y: -6)

            VStack(alignment: .leading, spacing: DesignTokens.spacing.inline) {
                HStack(alignment: .center, spacing: DesignTokens.spacing.item) {
                    Text(moment.title)
                        .font(DesignTokens.type.titleSM)
                        .foregroundColor(DesignTokens.base.onDark)
                        .lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if let s = moment.status, !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Text(s.uppercased())
                            .font(DesignTokens.type.micro)
                            .foregroundColor(theme.text)
                            .padding(.horizontal, DesignTokens.spacing.item)
                            .padding(.vertical, DesignTokens.spacing.xs)
                            .background(theme.surface.opacity(0.9))
                            .overlay(
                                RoundedRectangle(cornerRadius: DesignTokens.radius.data)
                                    .stroke(theme.text.opacity(0.25), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.data))
                    }
                }

                if let dest = moment.destination, !dest.isEmpty {
                    Text(dest)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                }
                if let dateLine = ShellFormatters.momentDateLine(start: moment.tripStartDate, end: moment.tripEndDate) {
                    Text(dateLine)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                }
                if let due = moment.contributionDueDate, !due.isEmpty {
                    Text("Due \(due)")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(DesignTokens.urgency.medium)
                }
            }
            .padding(DesignTokens.spacing.cardH)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface, in: RoundedRectangle(cornerRadius: DesignTokens.radius.momentCard))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radius.momentCard)
                .stroke(MomentraBase.s300.opacity(0.5), lineWidth: 0.5)
        )
        .contentShape(RoundedRectangle(cornerRadius: DesignTokens.radius.momentCard))
    }
}

// MARK: - Expense read-only (Activity tap)

struct GroupExpenseDetailSheet: View {
    let expense: GroupExpenseOut
    let onClose: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Expense") {
                    LabeledContent("Title", value: expense.title)
                    LabeledContent("Amount", value: DesignTokens.formatInr(expense.amount))
                    LabeledContent("Date", value: expense.expenseDate)
                    LabeledContent("Category", value: expense.categoryKey)
                    if let sub = expense.subcategory, !sub.isEmpty {
                        LabeledContent("Subcategory", value: sub)
                    }
                    if let payer = expense.paidByName, !payer.isEmpty {
                        LabeledContent("Paid by", value: payer)
                    }
                    if let mode = expense.splitMode, !mode.isEmpty {
                        LabeledContent("Split", value: mode)
                    }
                    LabeledContent("Status", value: expense.status)
                }
                Section {
                    Text("Editing or deleting a shared expense is not available in this build yet (no API).")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                        onClose()
                    }
                }
            }
        }
        .tint(DesignTokens.group.accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }
}

// MARK: - Moment detail (Plan tap)

struct GroupMomentDetailView: View {
    let detail: GroupMomentDetailOut
    @ObservedObject var auth: AuthManager
    let onDismiss: () -> Void
    let onRefresh: () async -> Void
    let onAddExpense: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false
    @State private var titleText = ""
    @State private var targetText = ""
    @State private var destinationText = ""
    @State private var dueText = ""
    @State private var statusText = "active"
    @State private var sendPaymentReminders = false
    @State private var autoNotifyOnContribution = false
    @State private var allowPartialPayments = false
    @State private var requireReceiptForExpenses = false
    @State private var requireOrganiserApproval = false
    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var showDeleteConfirm = false

    private var theme: ContextTheme { ContextTheme.theme(for: .group) }

    private var isOwner: Bool {
        guard let uid = auth.firebaseUid, let owner = detail.moment.ownerUid else { return false }
        return uid == owner
    }

    var body: some View {
        NavigationStack {
            Form {
                if isEditing {
                    TextField("Title", text: $titleText)
                    TextField("Target amount (optional)", text: $targetText)
                        .keyboardType(.decimalPad)
                    TextField("Destination (optional)", text: $destinationText)
                    TextField("Contribution due (YYYY-MM-DD)", text: $dueText)
                    Picker("Status", selection: $statusText) {
                        Text("Active").tag("active")
                        Text("Completed").tag("completed")
                        Text("Archived").tag("archived")
                    }
                    Section("Rules") {
                        Toggle("Payment reminders", isOn: $sendPaymentReminders)
                        Toggle("Auto-notify on contribution", isOn: $autoNotifyOnContribution)
                        Toggle("Allow partial payments", isOn: $allowPartialPayments)
                        Toggle("Require receipt for expenses", isOn: $requireReceiptForExpenses)
                        Toggle("Require organiser approval", isOn: $requireOrganiserApproval)
                    }
                } else {
                    Section("Moment") {
                        LabeledContent("Status", value: detail.moment.status ?? "—")
                        if let dest = detail.moment.destination, !dest.isEmpty {
                            LabeledContent("Destination", value: dest)
                        }
                        if let dateLine = ShellFormatters.momentDateLine(start: detail.moment.tripStartDate, end: detail.moment.tripEndDate) {
                            LabeledContent("Dates", value: dateLine)
                        }
                        if let due = detail.moment.contributionDueDate, !due.isEmpty {
                            LabeledContent("Due", value: due)
                        }
                        if let t = detail.moment.targetAmount {
                            LabeledContent("Target", value: DesignTokens.formatInr(t))
                        }
                        if let r = detail.moment.raisedAmount {
                            LabeledContent("Raised", value: DesignTokens.formatInr(r))
                        }
                        if let totals = detail.totals {
                            LabeledContent("Spent (expenses)", value: DesignTokens.formatInr(totals.spentExpensesAmount))
                        }
                    }
                    Section("People") {
                        Text("\(detail.members.count) members on this moment.")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                }

                if let statusMessage, !statusMessage.isEmpty {
                    Text(statusMessage)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(DesignTokens.urgency.highText)
                }

                if !isEditing {
                    Section {
                        Button("Add shared expense") { onAddExpense() }
                        if isOwner {
                            Button("Edit moment") { beginEdit() }
                            Button("Delete moment", role: .destructive) { showDeleteConfirm = true }
                        } else if detail.moment.ownerUid == nil {
                            Text("Organiser controls are unavailable until this moment loads owner info.")
                                .font(DesignTokens.type.caption)
                                .foregroundColor(MomentraBase.onDark60)
                        }
                    }
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle(isEditing ? "Edit moment" : detail.moment.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isEditing ? "Cancel" : "Close") {
                        if isEditing {
                            isEditing = false
                            loadFromDetail()
                        } else {
                            dismiss()
                            onDismiss()
                        }
                    }
                }
                if isEditing {
                    ToolbarItem(placement: .confirmationAction) {
                        if isSubmitting {
                            ProgressView().tint(theme.accent)
                        } else {
                            Button("Save") { Task { await savePatch() } }
                                .foregroundColor(theme.accent)
                        }
                    }
                }
            }
            .confirmationDialog("Delete this group moment?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { Task { await deleteMoment() } }
                Button("Cancel", role: .cancel) {}
            }
        }
        .tint(theme.accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .onAppear { loadFromDetail() }
    }

    private func beginEdit() {
        loadFromDetail()
        isEditing = true
    }

    private func loadFromDetail() {
        titleText = detail.moment.title
        if let t = detail.moment.targetAmount {
            targetText = String(format: "%g", t)
        } else {
            targetText = ""
        }
        destinationText = detail.moment.destination ?? ""
        dueText = detail.moment.contributionDueDate ?? ""
        statusText = (detail.moment.status ?? "active").lowercased()
        let r = detail.rules
        sendPaymentReminders = r.sendPaymentReminders
        autoNotifyOnContribution = r.autoNotifyOnContribution
        allowPartialPayments = r.allowPartialPayments
        requireReceiptForExpenses = r.requireReceiptForExpenses
        requireOrganiserApproval = r.requireOrganiserApproval
    }

    private func savePatch() async {
        guard let token = auth.getAccessToken() else {
            statusMessage = "Unauthorized session"
            return
        }
        let trimmedTitle = titleText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else {
            statusMessage = "Title required"
            return
        }
        let target = Double(targetText.trimmingCharacters(in: .whitespacesAndNewlines))
        let dest = destinationText.trimmingCharacters(in: .whitespacesAndNewlines)
        let due = dueText.trimmingCharacters(in: .whitespacesAndNewlines)
        let rules = GroupMomentRulesIn(
            sendPaymentReminders: sendPaymentReminders,
            autoNotifyOnContribution: autoNotifyOnContribution,
            allowPartialPayments: allowPartialPayments,
            requireReceiptForExpenses: requireReceiptForExpenses,
            requireOrganiserApproval: requireOrganiserApproval
        )
        let patch = GroupMomentPatchIn(
            title: trimmedTitle,
            targetAmount: target,
            destination: dest.isEmpty ? nil : dest,
            contributionDueDate: due.isEmpty ? nil : due,
            rules: rules,
            status: statusText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        )
        isSubmitting = true
        statusMessage = nil
        defer { isSubmitting = false }
        do {
            _ = try await NetworkService.shared.patchGroupMoment(momentId: detail.moment.id, body: patch, token: token)
            await onRefresh()
            isEditing = false
            dismiss()
            onDismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func deleteMoment() async {
        guard let token = auth.getAccessToken() else {
            statusMessage = "Unauthorized session"
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            try await NetworkService.shared.deleteGroupMoment(momentId: detail.moment.id, token: token)
            await onRefresh()
            dismiss()
            onDismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
