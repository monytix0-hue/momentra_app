import SwiftUI

// MARK: - Personal moment detail (Plan → tap)

struct PersonalMomentDetailView: View {
    let moment: PersonalMomentItemOut
    @ObservedObject var auth: AuthManager
    @ObservedObject var viewModel: MainShellViewModel
    let onDismiss: () -> Void
    let onRefresh: () async -> Void
    let onAddExpense: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false
    @State private var titleText = ""
    @State private var targetText = ""
    @State private var descriptionText = ""
    @State private var startDateText = ""
    @State private var endDateText = ""
    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                if isEditing {
                    TextField("Title", text: $titleText)
                    TextField("Target amount (optional)", text: $targetText)
                        .keyboardType(.decimalPad)
                    TextField("Start date (YYYY-MM-DD)", text: $startDateText)
                    TextField("End date (optional)", text: $endDateText)
                    TextField("Description", text: $descriptionText, axis: .vertical)
                        .lineLimit(2...6)
                } else {
                    Section("Summary") {
                        LabeledContent("Type", value: moment.momentType ?? "—")
                        LabeledContent("Status", value: moment.status ?? "—")
                        if let t = moment.targetAmount {
                            LabeledContent("Target", value: DesignTokens.formatInr(t))
                        }
                        if let s = moment.savedAmount {
                            LabeledContent("Saved", value: DesignTokens.formatInr(s))
                        }
                        if let s = moment.startDate, !s.isEmpty { LabeledContent("Start", value: s) }
                        if let e = moment.endDate, !e.isEmpty { LabeledContent("End", value: e) }
                        if let d = moment.description, !d.isEmpty {
                            Text(d).font(DesignTokens.type.caption)
                        }
                    }
                }

                if let statusMessage, !statusMessage.isEmpty {
                    Text(statusMessage)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(DesignTokens.urgency.highText)
                }

                if !isEditing {
                    Section {
                        Button("Add income or expense") { onAddExpense() }
                        Button("Edit") { beginEdit() }
                        Button("Delete moment", role: .destructive) { showDeleteConfirm = true }
                    }
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle(isEditing ? "Edit moment" : moment.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isEditing ? "Cancel" : "Close") {
                        if isEditing {
                            isEditing = false
                            resetFieldsFromMoment()
                        } else {
                            dismiss()
                            onDismiss()
                        }
                    }
                }
                if isEditing {
                    ToolbarItem(placement: .confirmationAction) {
                        if isSubmitting {
                            ProgressView()
                        } else {
                            Button("Save") { Task { await savePatch() } }
                        }
                    }
                }
            }
            .confirmationDialog("Delete this moment?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { Task { await deleteMoment() } }
                Button("Cancel", role: .cancel) {}
            }
        }
        .tint(DesignTokens.personal.accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .onAppear { resetFieldsFromMoment() }
    }

    private func beginEdit() {
        resetFieldsFromMoment()
        isEditing = true
    }

    private func resetFieldsFromMoment() {
        titleText = moment.title
        if let t = moment.targetAmount {
            targetText = String(format: "%g", t)
        } else {
            targetText = ""
        }
        descriptionText = moment.description ?? ""
        startDateText = moment.startDate ?? ""
        endDateText = moment.endDate ?? ""
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
        let start = startDateText.trimmingCharacters(in: .whitespacesAndNewlines)
        let end = endDateText.trimmingCharacters(in: .whitespacesAndNewlines)
        let desc = descriptionText.trimmingCharacters(in: .whitespacesAndNewlines)
        let patch = PersonalMomentPatchIn(
            title: trimmedTitle,
            targetAmount: target,
            durationType: nil,
            startDate: start.isEmpty ? nil : start,
            endDate: end.isEmpty ? nil : end,
            description: desc.isEmpty ? nil : desc,
            savingMode: nil,
            isPrivateMoment: nil
        )
        isSubmitting = true
        statusMessage = nil
        defer { isSubmitting = false }
        do {
            _ = try await NetworkService.shared.patchPersonalMoment(momentId: moment.momentId, body: patch, token: token)
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
            try await NetworkService.shared.deletePersonalMoment(momentId: moment.momentId, token: token)
            await onRefresh()
            dismiss()
            onDismiss()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}

// MARK: - Personal transaction edit (Activity)

struct PersonalTransactionEditSheet: View {
    let transaction: PersonalTransactionOut
    @ObservedObject var auth: AuthManager
    let onFinished: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var titleText = ""
    @State private var amountText = ""
    @State private var categoryText = ""
    @State private var noteText = ""
    @State private var txnDateText = ""
    @State private var isIncome = false
    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                Toggle("Income", isOn: $isIncome)
                TextField("Title", text: $titleText)
                TextField("Amount", text: $amountText)
                    .keyboardType(.decimalPad)
                TextField("Category", text: $categoryText)
                TextField("Book date (YYYY-MM-DD)", text: $txnDateText)
                TextField("Note (optional)", text: $noteText, axis: .vertical)
                    .lineLimit(2...5)
                if let statusMessage, !statusMessage.isEmpty {
                    Text(statusMessage)
                        .font(DesignTokens.type.caption)
                        .foregroundColor(DesignTokens.urgency.highText)
                }
                Section {
                    Button("Delete transaction", role: .destructive) { showDeleteConfirm = true }
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("Edit transaction")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                        onFinished()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Save") { Task { await save() } }
                    }
                }
            }
            .confirmationDialog("Delete this transaction?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { Task { await deleteTxn() } }
                Button("Cancel", role: .cancel) {}
            }
            .onAppear { loadFromTransaction() }
        }
        .tint(DesignTokens.personal.accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    private func loadFromTransaction() {
        titleText = transaction.title
        amountText = String(format: "%g", transaction.amount)
        categoryText = transaction.category ?? "expense"
        noteText = transaction.note ?? ""
        isIncome = transaction.isIncome
        if let d = transaction.txnDate {
            txnDateText = PersonalBookDateFormatting.yyyyMMdd(from: d)
        } else {
            txnDateText = PersonalBookDateFormatting.yyyyMMdd()
        }
    }

    private func save() async {
        guard let token = auth.getAccessToken() else {
            statusMessage = "Unauthorized session"
            return
        }
        guard let amount = Double(amountText.trimmingCharacters(in: .whitespacesAndNewlines)), amount > 0 else {
            statusMessage = "Enter a valid amount"
            return
        }
        let cat = categoryText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cat.isEmpty else {
            statusMessage = "Category required"
            return
        }
        let day = txnDateText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard day.count == 10 else {
            statusMessage = "Use YYYY-MM-DD for book date"
            return
        }
        let patch = PersonalTransactionPatchIn(
            isIncome: isIncome,
            amount: amount,
            category: cat,
            subcategoryId: transaction.subcategoryId,
            subcategoryLabel: transaction.subcategoryLabel,
            accountId: nil,
            title: titleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : titleText,
            note: noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : noteText,
            txnDate: day
        )
        isSubmitting = true
        statusMessage = nil
        defer { isSubmitting = false }
        do {
            _ = try await NetworkService.shared.patchPersonalTransaction(transactionId: transaction.id, body: patch, token: token)
            dismiss()
            onFinished()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func deleteTxn() async {
        guard let token = auth.getAccessToken() else {
            statusMessage = "Unauthorized session"
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            try await NetworkService.shared.deletePersonalTransaction(transactionId: transaction.id, token: token)
            dismiss()
            onFinished()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
