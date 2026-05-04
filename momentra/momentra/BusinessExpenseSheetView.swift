//
//  BusinessExpenseSheetView.swift
//  momentra
//

import SwiftUI

private let expenseCategorySubcategoryMap: [String: [String]] = [
    "Operations": ["Rent", "Utilities", "Maintenance", "Office Supplies"],
    "Marketing": ["Digital Ads", "Print Ads", "Promotions", "Branding"],
    "Payroll": ["Salaries", "Contractors", "Bonuses", "Staff Welfare"],
    "Logistics": ["Fuel", "Transport", "Delivery", "Packaging"]
]

private let purchaseCategorySubcategoryMap: [String: [String]] = [
    "Raw Materials": ["Seeds", "Oil Cakes", "Ingredients", "Bulk Inputs"],
    "Inventory Stock": ["Finished Goods", "Retail Stock", "Wholesale Stock"],
    "Packaging Purchase": ["Bottles", "Labels", "Boxes", "Pouches"],
    "Equipment Purchase": ["Machinery", "Tools", "Spare Parts", "Appliances"]
]

private func chooseBudgetCategoryId(entryKind: String, categories: [BusinessBudgetCategoryOut]) -> String {
    guard !categories.isEmpty else { return "" }
    let preferred = entryKind == "purchase"
        ? ["purchase", "inventory", "stock", "material", "procurement"]
        : ["expense", "operations", "marketing", "payroll", "logistics", "admin"]

    if let match = categories.first(where: { cat in
        preferred.contains(where: { key in cat.name.localizedCaseInsensitiveContains(key) })
    }) {
        return match.categoryId
    }
    return categories[0].categoryId
}

struct BusinessExpenseSheetView: View {
    let categories: [BusinessBudgetCategoryOut]
    let catalog: BusinessCatalogOut?
    let vendorOptions: [String]
    let defaultKind: String
    let sheetKey: Int
    let accent: Color
    let isSubmitting: Bool
    let onCancel: () -> Void
    let onSubmit: (BusinessExpenseCreateIn) -> Void

    @State private var kind: String = "expense"
    @State private var budgetCategoryId: String = ""
    @State private var businessCategory: String = expenseCategorySubcategoryMap.keys.first ?? ""
    @State private var businessSubcategory: String = expenseCategorySubcategoryMap.values.first?.first ?? ""
    @State private var title: String = ""
    @State private var amountInput: String = ""
    @State private var paidMode: String = "upi"
    @State private var vendorName: String = ""
    @State private var unit: String = "kg"
    @State private var quantityInput: String = ""
    @State private var pricePerUnitInput: String = ""
    @State private var purchasePaymentStatus: String = "paid"
    @State private var paidAmountInput: String = ""
    @State private var receiptAttached: Bool = false
    @State private var localError: String?

    private let paidModes = ["cash", "upi", "card"]
    private let units = ["kg", "lt", "gm"]

    private var catalogRows: [BusinessCatalogCategoryOut] {
        kind == "purchase" ? (catalog?.purchase ?? []) : (catalog?.expense ?? [])
    }

    private var businessMap: [String: [String]] {
        if !catalogRows.isEmpty {
            return Dictionary(uniqueKeysWithValues: catalogRows.map { ($0.name, $0.subcategories) })
        }
        return kind == "purchase" ? purchaseCategorySubcategoryMap : expenseCategorySubcategoryMap
    }

    private var businessCategories: [String] {
        Array(businessMap.keys)
    }

    private var subcategoryOptions: [String] {
        businessMap[businessCategory] ?? []
    }

    private func chooseCatalogBudgetCategoryId() -> String {
        if let row = catalogRows.first(where: { $0.name.caseInsensitiveCompare(businessCategory) == .orderedSame }) {
            return row.budgetCategoryId
        }
        return catalogRows.first?.budgetCategoryId ?? ""
    }

    var body: some View {
        NavigationStack {
            Form {
                if categories.isEmpty {
                    Text("This budget has no categories yet. Add categories in moment settings.")
                        .foregroundColor(DesignTokens.business.text)
                }
                Picker("Type", selection: $kind) {
                    Text("Expense").tag("expense")
                    Text("Purchase").tag("purchase")
                }
                .pickerStyle(.segmented)

                Picker(kind == "purchase" ? "Purchase category" : "Expense category", selection: $businessCategory) {
                    ForEach(businessCategories, id: \.self) { label in
                        Text(label).tag(label)
                    }
                }
                .onChange(of: businessCategory) { _ in
                    businessSubcategory = subcategoryOptions.first ?? ""
                }

                Picker("Subcategory", selection: $businessSubcategory) {
                    ForEach(subcategoryOptions, id: \.self) { sub in
                        Text(sub).tag(sub)
                    }
                }
                TextField(kind == "purchase" ? "Title (optional)" : "Title (optional)", text: $title)

                if kind == "expense" {
                    TextField("Amount", text: $amountInput)
                        .keyboardType(.decimalPad)
                    Picker("Paid with", selection: $paidMode) {
                        ForEach(paidModes, id: \.self) { m in
                            Text(m.uppercased()).tag(m)
                        }
                    }
                } else {
                    TextField("Quantity", text: $quantityInput)
                        .keyboardType(.decimalPad)
                    Picker("Unit", selection: $unit) {
                        ForEach(units, id: \.self) { u in
                            Text(u).tag(u)
                        }
                    }
                    TextField("Price per unit", text: $pricePerUnitInput)
                        .keyboardType(.decimalPad)

                    if !vendorOptions.isEmpty {
                        Menu {
                            ForEach(vendorOptions, id: \.self) { v in
                                Button(v) { vendorName = v }
                            }
                        } label: {
                            Text("Insert saved vendor")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(accent)
                        }
                    }
                    TextField("Vendor name (required)", text: $vendorName)

                    Picker("Payment status", selection: $purchasePaymentStatus) {
                        Text("Paid").tag("paid")
                        Text("Partially paid").tag("partially_paid")
                        Text("Credit").tag("credit")
                    }

                    if purchasePaymentStatus == "partially_paid" || purchasePaymentStatus == "credit" {
                        TextField("Paid amount", text: $paidAmountInput)
                            .keyboardType(.decimalPad)
                    }
                }

                Toggle("Receipt attached / will attach", isOn: $receiptAttached)

                if let localError, !localError.isEmpty {
                    Text(localError)
                        .foregroundColor(DesignTokens.urgency.highText)
                        .font(.system(size: 13))
                }
            }
            .id(sheetKey)
            .momentraFormSheetChrome()
            .onAppear {
                kind = defaultKind
                budgetCategoryId = chooseCatalogBudgetCategoryId()
                if budgetCategoryId.isEmpty {
                    budgetCategoryId = chooseBudgetCategoryId(entryKind: kind, categories: categories)
                }
                let map = businessMap
                businessCategory = map.keys.first ?? ""
                businessSubcategory = map[businessCategory]?.first ?? ""
            }
            .onChange(of: kind) { newKind in
                budgetCategoryId = chooseCatalogBudgetCategoryId()
                if budgetCategoryId.isEmpty {
                    budgetCategoryId = chooseBudgetCategoryId(entryKind: newKind, categories: categories)
                }
                let map = businessMap
                businessCategory = map.keys.first ?? ""
                businessSubcategory = map[businessCategory]?.first ?? ""
            }
            .navigationTitle(kind == "purchase" ? "Add purchase" : "Add expense")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                        .disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Submit") { submit() }
                            .disabled(categories.isEmpty)
                    }
                }
            }
        }
        .tint(accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .preferredColorScheme(.dark)
    }

    private func submit() {
        localError = nil
        if budgetCategoryId.isEmpty {
            budgetCategoryId = chooseCatalogBudgetCategoryId()
        }
        if budgetCategoryId.isEmpty {
            budgetCategoryId = chooseBudgetCategoryId(entryKind: kind, categories: categories)
        }
        guard !budgetCategoryId.isEmpty else {
            localError = "No budget category available"
            return
        }
        guard !businessCategory.isEmpty else {
            localError = "Pick a category"
            return
        }
        let sub = businessSubcategory.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !sub.isEmpty else {
            localError = "Pick a subcategory"
            return
        }
        let titleTrim = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let baseTitle = titleTrim.isEmpty ? (kind == "purchase" ? "Purchase" : "Expense") : titleTrim
        let subcategoryLabel = "\(businessCategory) · \(sub)"

        if kind == "expense" {
            guard let amt = Double(amountInput.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)),
                  amt > 0
            else {
                localError = "Enter a valid amount"
                return
            }
            let body = BusinessExpenseCreateIn(
                amount: amt,
                categoryId: budgetCategoryId,
                title: baseTitle,
                subcategoryLabel: subcategoryLabel,
                entryKind: "expense",
                expenseOrPurchase: "expense",
                paidMode: paidMode,
                purchasePaymentStatus: nil,
                quantity: nil,
                unit: nil,
                pricePerUnit: nil,
                totalAmount: nil,
                paidAmount: nil,
                vendorName: nil,
                receiptAttached: receiptAttached
            )
            onSubmit(body)
            return
        }

        // purchase
        guard let qty = Double(quantityInput.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)),
              let ppu = Double(pricePerUnitInput.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)),
              qty > 0, ppu > 0
        else {
            localError = "Enter quantity and price per unit"
            return
        }
        let total = (qty * ppu * 100).rounded() / 100
        let vendor = vendorName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !vendor.isEmpty else {
            localError = "Vendor name is required"
            return
        }

        var paidAmt: Double? = nil
        if purchasePaymentStatus == "partially_paid" || purchasePaymentStatus == "credit" {
            guard let p = Double(paidAmountInput.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)) else {
                localError = "Enter paid amount"
                return
            }
            paidAmt = p
            if purchasePaymentStatus == "credit", p != 0 {
                localError = "Credit purchases must have paid amount 0"
                return
            }
        }

        let body = BusinessExpenseCreateIn(
            amount: total,
            categoryId: budgetCategoryId,
            title: baseTitle,
            subcategoryLabel: subcategoryLabel,
            entryKind: "purchase",
            expenseOrPurchase: "purchase",
            paidMode: nil,
            purchasePaymentStatus: purchasePaymentStatus,
            quantity: qty,
            unit: unit,
            pricePerUnit: ppu,
            totalAmount: total,
            paidAmount: paidAmt,
            vendorName: vendor,
            receiptAttached: receiptAttached
        )
        onSubmit(body)
    }
}
