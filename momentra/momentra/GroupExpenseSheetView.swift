import SwiftUI
import UniformTypeIdentifiers

/// Suggested sublabels per seeded `category_key` (see backend `_seed_group_budget_categories`).
enum GroupExpenseSubcategorySuggestions {
    static func options(for categoryKey: String) -> [String] {
        let key = categoryKey.lowercased()
        let map: [String: [String]] = [
            "accommodation": ["Rent", "Utilities", "Maintenance", "Insurance", "Other"],
            "food": ["Groceries", "Dining out", "Delivery", "Coffee & snacks", "Other"],
            "transport": ["Fuel", "Cabs / rides", "Public transit", "Parking", "Other"],
            "activities": ["Events", "Subscriptions", "Tickets", "Other"],
            "shopping": ["Household supplies", "Clothing", "Electronics", "Other"],
            "emergency": ["Fees", "Unexpected", "Other"],
        ]
        return map[key] ?? ["General", "Other"]
    }
}

struct GroupExpenseSheetView: View {
    let categories: [(key: String, label: String)]
    let members: [(id: String, label: String)]
    let defaultPaidByMemberId: String?
    let defaultCategoryKey: String?
    let sheetKey: Int
    let accent: Color
    let isSubmitting: Bool
    let onCancel: () -> Void
    /// Second parameter is an optional security-scoped file URL for receipt upload after create.
    let onSubmit: (GroupExpenseCreateIn, URL?) -> Void

    @State private var title: String = ""
    @State private var amount: String = ""
    @State private var expenseDateIso: String = ""
    @State private var categoryKey: String = ""
    @State private var paidByMemberId: String = ""
    @State private var subcategoryChoice: String = ""
    @State private var subcategoryCustom: String = ""
    @State private var receiptNotes: String = ""
    @State private var receiptFileURL: URL?
    @State private var receiptFileName: String?
    @State private var showReceiptImporter = false
    @State private var validationError: String?

    private var subcategoryOptions: [String] {
        GroupExpenseSubcategorySuggestions.options(for: categoryKey)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                TextField("Amount", text: $amount)
                    .keyboardType(.decimalPad)
                TextField("Date (YYYY-MM-DD)", text: $expenseDateIso)
                if categories.isEmpty {
                    Text("No categories available yet.")
                        .font(.caption)
                        .foregroundColor(DesignTokens.group.text)
                } else {
                    Picker("Category", selection: $categoryKey) {
                        ForEach(categories, id: \.key) { row in
                            Text(row.label).tag(row.key)
                        }
                    }
                    .onChange(of: categoryKey) { _, _ in
                        subcategoryChoice = ""
                        subcategoryCustom = ""
                    }
                    Picker("Subcategory", selection: $subcategoryChoice) {
                        Text("None").tag("")
                        ForEach(subcategoryOptions, id: \.self) { opt in
                            Text(opt).tag(opt)
                        }
                    }
                    TextField("Or custom subcategory", text: $subcategoryCustom)
                        .autocapitalization(.words)
                }
                if members.isEmpty {
                    Text("No joined members — you cannot add an expense yet.")
                        .font(.caption)
                        .foregroundColor(DesignTokens.group.text)
                } else {
                    Picker("Paid by", selection: $paidByMemberId) {
                        ForEach(members, id: \.id) { row in
                            Text(row.label).tag(row.id)
                        }
                    }
                }
                Section {
                    Button(receiptFileName == nil ? "Attach receipt (optional)…" : "Change receipt…") {
                        showReceiptImporter = true
                    }
                    .foregroundColor(accent)
                    if let receiptFileName {
                        Text("Selected: \(receiptFileName)")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraBase.onDark60)
                    }
                    TextField("Receipt notes (optional)", text: $receiptNotes, axis: .vertical)
                        .lineLimit(2...4)
                } header: {
                    Text("Receipt")
                } footer: {
                    Text("PDF or image, max 10 MB on server after save.")
                        .font(DesignTokens.type.micro)
                        .foregroundColor(MomentraBase.onDark40)
                }
                if let validationError, !validationError.isEmpty {
                    Text(validationError).foregroundColor(DesignTokens.urgency.highText)
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("Add expense")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel).disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView().tint(accent)
                    } else {
                        Button("Submit") { submit() }
                            .foregroundColor(accent)
                    }
                }
            }
            .fileImporter(
                isPresented: $showReceiptImporter,
                allowedContentTypes: [.pdf, .jpeg, .png, .image],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    receiptFileURL = urls.first
                    receiptFileName = urls.first?.lastPathComponent
                case .failure(let err):
                    validationError = err.localizedDescription
                }
            }
        }
        .tint(accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .id(sheetKey)
        .onAppear {
            expenseDateIso = calendarDateIso()
            if let def = defaultCategoryKey, categories.contains(where: { $0.key == def }) {
                categoryKey = def
            } else if let first = categories.first?.key {
                categoryKey = first
            }
            subcategoryChoice = ""
            if let def = defaultPaidByMemberId, members.contains(where: { $0.id == def }) {
                paidByMemberId = def
            } else if let first = members.first?.id {
                paidByMemberId = first
            }
        }
    }

    private func resolvedSubcategory() -> String? {
        let custom = subcategoryCustom.trimmingCharacters(in: .whitespacesAndNewlines)
        if !custom.isEmpty { return custom }
        let pick = subcategoryChoice.trimmingCharacters(in: .whitespacesAndNewlines)
        if pick.isEmpty { return nil }
        return pick
    }

    private func submit() {
        validationError = nil
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty {
            validationError = "Enter a title"
            return
        }
        guard let amt = Double(amount.trimmingCharacters(in: .whitespacesAndNewlines)), amt > 0 else {
            validationError = "Enter a valid amount"
            return
        }
        if categoryKey.isEmpty {
            validationError = "Pick a category"
            return
        }
        if paidByMemberId.isEmpty {
            validationError = "Pick who paid"
            return
        }
        let date = expenseDateIso.trimmingCharacters(in: .whitespacesAndNewlines)
        if date.isEmpty {
            validationError = "Enter expense date"
            return
        }
        let notes = receiptNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        let body = GroupExpenseCreateIn(
            categoryKey: categoryKey,
            subcategory: resolvedSubcategory(),
            title: t,
            amount: amt,
            expenseDate: date,
            paidByMemberId: paidByMemberId,
            receiptNotes: notes.isEmpty ? nil : notes,
            splitMode: GroupSplitMode.equal,
            splitLines: []
        )
        onSubmit(body, receiptFileURL)
    }
}
