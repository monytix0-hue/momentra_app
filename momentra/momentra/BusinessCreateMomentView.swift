import SwiftUI

struct BusinessCreateMomentView: View {
    let preset: BusinessQuickTemplate?
    let sheetId: Int
    let isSubmitting: Bool
    let onCancel: () -> Void
    let onCreate: (BusinessBudgetCreateIn) -> Void

    @State private var budgetName: String = ""
    @State private var budgetType: String = "operations"
    @State private var totalBudget: String = ""
    @State private var budgetPeriod: String = "Monthly"
    @State private var department: String = "Operations"
    @State private var approvalThreshold: String = ""
    @State private var validationError: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Business moment name", text: $budgetName)
                TextField("Type (operations/procurement/sales)", text: $budgetType)
                TextField("Total budget (optional)", text: $totalBudget)
                    .keyboardType(.decimalPad)
                TextField("Budget period", text: $budgetPeriod)
                TextField("Department", text: $department)
                TextField("Approval threshold (optional)", text: $approvalThreshold)
                    .keyboardType(.decimalPad)
                if let validationError, !validationError.isEmpty {
                    Text(validationError).foregroundColor(DesignTokens.urgency.high)
                }
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.base.bg)
            .navigationTitle("New business moment")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel).disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Create") { submit() }
                    }
                }
            }
        }
        .id(sheetId)
        .onAppear { applyPreset() }
    }

    private func applyPreset() {
        guard let preset else {
            budgetName = ""
            budgetType = "operations"
            totalBudget = ""
            budgetPeriod = "Monthly"
            department = "Operations"
            approvalThreshold = ""
            return
        }
        budgetName = preset.budgetName
        budgetType = preset.budgetType
        if let amount = preset.totalBudget {
            totalBudget = String(format: "%g", amount)
        } else {
            totalBudget = ""
        }
        budgetPeriod = preset.budgetPeriod
        department = preset.department
        if let threshold = preset.approvalThreshold {
            approvalThreshold = String(format: "%g", threshold)
        } else {
            approvalThreshold = ""
        }
    }

    private func submit() {
        validationError = nil
        let trimmedName = budgetName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.isEmpty {
            validationError = "Enter a business moment name"
            return
        }
        let budgetValue = totalBudget.trimmingCharacters(in: .whitespacesAndNewlines)
        if !budgetValue.isEmpty && Double(budgetValue) == nil {
            validationError = "Total budget must be a valid number"
            return
        }
        let thresholdValue = approvalThreshold.trimmingCharacters(in: .whitespacesAndNewlines)
        if !thresholdValue.isEmpty && Double(thresholdValue) == nil {
            validationError = "Approval threshold must be a valid number"
            return
        }
        let body = BusinessBudgetCreateIn(
            budgetName: trimmedName,
            budgetType: budgetType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "operations" : budgetType,
            totalBudget: Double(budgetValue),
            budgetPeriod: budgetPeriod.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Monthly" : budgetPeriod,
            department: department.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Operations" : department,
            approvalThreshold: Double(thresholdValue),
            teamMembers: [],
            spendingPolicies: BusinessBudgetPoliciesIn(
                requireReceiptForAllExpenses: false,
                autoApproveBelowThreshold: true,
                managerApprovalRequired: true,
                notifyAdminOnSubmission: true,
                overBudgetAlerts: true,
                lockBudgetWhenLimitHit: false
            ),
            reminderPrefs: BusinessBudgetReminderPrefsOut(
                weeklyDigest: true,
                pendingApprovalAlerts: true,
                overBudgetAlerts: true,
                periodCloseReminder: true
            )
        )
        onCreate(body)
    }
}
