import SwiftUI

/// Maps to backend `moment_type`; `_seed_group_budget_categories` uses substring rules on this string.
private enum GroupMomentKind: String, CaseIterable, Identifiable, Hashable {
    case generalSplit = "trip_fund"
    case household = "household_bills"
    case diningOut = "food_outing_group"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .generalSplit: return "Trip, travel & general split"
        case .household: return "Rent & household"
        case .diningOut: return "Dining & outings"
        }
    }

    static func fromPresetMomentType(_ raw: String) -> GroupMomentKind {
        let t = raw.lowercased()
        if t.contains("rent") || t.contains("bills") || t.contains("household") || t.contains("flatshare") || t.contains("roommate") {
            return .household
        }
        if t.contains("food") || t.contains("outing") || t.contains("dining") || t.contains("restaurant") || t.contains("caf") {
            return .diningOut
        }
        return .generalSplit
    }
}

struct GroupCreateMomentView: View {
    let preset: GroupQuickTemplate?
    let sheetId: Int
    let isSubmitting: Bool
    let accent: Color
    let onCancel: () -> Void
    let onCreate: (GroupMomentCreateIn) -> Void

    private let templates = groupQuickTemplates()
    private var theme: ContextTheme { DesignTokens.theme(for: .group) }

    /// `nil` means **Custom** is selected.
    @State private var selectedTemplate: GroupQuickTemplate?

    @State private var title: String = ""
    @State private var momentKind: GroupMomentKind = .generalSplit
    @State private var showAdvancedMomentType = false
    @State private var advancedMomentType: String = "trip_fund"
    @State private var splitMode: String = GroupSplitMode.equal
    @State private var targetAmount: String = ""
    @State private var destination: String = ""
    @State private var tripStartIso: String = ""
    @State private var tripEndIso: String = ""
    @State private var contributionDueIso: String = ""
    @State private var validationError: String?

    private let splitOptions: [(String, String)] = [
        (GroupSplitMode.equal, "Equal"),
        (GroupSplitMode.exact, "Exact"),
        (GroupSplitMode.percent, "%"),
        (GroupSplitMode.shares, "Shares"),
    ]

    private var resolvedMomentType: String {
        if showAdvancedMomentType {
            let t = advancedMomentType.trimmingCharacters(in: .whitespacesAndNewlines)
            return t.isEmpty ? momentKind.rawValue : t
        }
        return momentKind.rawValue
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: DesignTokens.spacing.item) {
                            templateChip(
                                title: "Custom",
                                subtitle: "Blank form",
                                selected: selectedTemplate == nil
                            ) {
                                selectedTemplate = nil
                                applyFields(from: nil)
                            }
                            ForEach(templates, id: \.self) { tpl in
                                templateChip(
                                    title: tpl.title,
                                    subtitle: tpl.subtitle,
                                    selected: selectedTemplate == tpl
                                ) {
                                    selectedTemplate = tpl
                                    applyFields(from: tpl)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                } header: {
                    Text("Template")
                        .font(DesignTokens.type.caption)
                        .foregroundColor(MomentraBase.onDark60)
                }

                TextField("Title", text: $title)
                Picker("Moment kind", selection: $momentKind) {
                    ForEach(GroupMomentKind.allCases) { kind in
                        Text(kind.label).tag(kind)
                    }
                }
                .onChange(of: momentKind) { _, new in
                    advancedMomentType = new.rawValue
                }

                Section {
                    Toggle("Show advanced API moment type", isOn: $showAdvancedMomentType)
                    if showAdvancedMomentType {
                        TextField("Moment type (API)", text: $advancedMomentType)
                            .autocapitalization(.none)
                    }
                } header: {
                    Text("Advanced")
                } footer: {
                    Text("Most moments use a preset kind above. Enable advanced only if your backend expects a custom type string.")
                        .font(DesignTokens.type.micro)
                        .foregroundColor(MomentraBase.onDark40)
                }

                Picker("Split mode", selection: $splitMode) {
                    ForEach(splitOptions, id: \.0) { opt in
                        Text(opt.1).tag(opt.0)
                    }
                }
                TextField("Target amount (optional)", text: $targetAmount)
                    .keyboardType(.decimalPad)
                TextField("Destination / theme (optional)", text: $destination)
                TextField("Start date (YYYY-MM-DD)", text: $tripStartIso)
                TextField("End date (YYYY-MM-DD)", text: $tripEndIso)
                TextField("Contribution due (YYYY-MM-DD, optional)", text: $contributionDueIso)
                if let validationError, !validationError.isEmpty {
                    Text(validationError).foregroundColor(DesignTokens.urgency.highText)
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("New group moment")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel).disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView().tint(accent)
                    } else {
                        Button("Create") { submit() }
                            .foregroundColor(accent)
                    }
                }
            }
        }
        .tint(accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .id(sheetId)
        .onAppear {
            if let preset {
                if let match = templates.first(where: { $0 == preset }) {
                    selectedTemplate = match
                } else {
                    selectedTemplate = nil
                }
                applyFields(from: preset)
            } else {
                selectedTemplate = nil
                applyFields(from: nil)
            }
        }
    }

    private func templateChip(title: String, subtitle: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: DesignTokens.spacing.xs) {
                Text(title)
                    .font(DesignTokens.type.bodyMedium)
                    .foregroundColor(DesignTokens.base.onDark)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(DesignTokens.type.micro)
                        .foregroundColor(MomentraBase.onDark60)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(minWidth: 100, alignment: .leading)
            .padding(.horizontal, DesignTokens.spacing.cardH)
            .padding(.vertical, DesignTokens.spacing.item)
            .background(
                selected ? theme.accent.opacity(0.2) : theme.surface.opacity(0.75),
                in: RoundedRectangle(cornerRadius: DesignTokens.radius.data)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.radius.data)
                    .stroke(
                        selected ? theme.accent.opacity(0.85) : MomentraBase.s300.opacity(0.5),
                        lineWidth: selected ? 1.5 : 0.5
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private func applyFields(from preset: GroupQuickTemplate?) {
        let today = calendarDateIso()
        let nextYear = calendarDateIsoPlusYears(1)
        guard let preset else {
            title = ""
            momentKind = .generalSplit
            advancedMomentType = GroupMomentKind.generalSplit.rawValue
            showAdvancedMomentType = false
            splitMode = GroupSplitMode.equal
            targetAmount = ""
            destination = ""
            tripStartIso = today
            tripEndIso = nextYear
            contributionDueIso = ""
            return
        }
        title = preset.title
        momentKind = GroupMomentKind.fromPresetMomentType(preset.momentType)
        advancedMomentType = preset.momentType
        splitMode = preset.splitMode
        if let t = preset.targetAmount {
            targetAmount = String(format: "%g", t)
        } else {
            targetAmount = ""
        }
        destination = preset.destination ?? ""
        tripStartIso = preset.tripStartDateIso ?? today
        tripEndIso = preset.tripEndDateIso ?? nextYear
        contributionDueIso = ""
    }

    private func submit() {
        validationError = nil
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty {
            validationError = "Enter a title"
            return
        }
        let target = targetAmount.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? nil
            : Double(targetAmount.trimmingCharacters(in: .whitespacesAndNewlines))
        if targetAmount.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false && target == nil {
            validationError = "Target amount must be a number"
            return
        }
        let rules = GroupMomentRulesIn(
            sendPaymentReminders: true,
            autoNotifyOnContribution: true,
            allowPartialPayments: true,
            requireReceiptForExpenses: false,
            requireOrganiserApproval: false
        )
        let mt = resolvedMomentType.trimmingCharacters(in: .whitespacesAndNewlines)
        let body = GroupMomentCreateIn(
            title: t,
            momentType: mt.isEmpty ? GroupMomentKind.generalSplit.rawValue : mt,
            targetAmount: target,
            destination: destination.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : destination.trimmingCharacters(in: .whitespacesAndNewlines),
            tripStartDate: tripStartIso.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : tripStartIso.trimmingCharacters(in: .whitespacesAndNewlines),
            tripEndDate: tripEndIso.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : tripEndIso.trimmingCharacters(in: .whitespacesAndNewlines),
            splitMode: splitMode,
            contributionDueDate: contributionDueIso.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : contributionDueIso.trimmingCharacters(in: .whitespacesAndNewlines),
            members: [],
            rules: rules
        )
        onCreate(body)
    }
}
