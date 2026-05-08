import SwiftUI

struct BusinessMemberSheetView: View {
    let isSubmitting: Bool
    let resultMessage: String?
    let accent: Color
    let onCancel: () -> Void
    let onSubmit: (BusinessBudgetMemberIn) -> Void

    @State private var displayName: String = ""
    @State private var email: String = ""
    @State private var role: String = "employee"
    @State private var limit: String = ""

    private let roles = ["employee", "manager", "finance", "admin"]

    var body: some View {
        NavigationStack {
            Form {
                TextField("Display name", text: $displayName)
                TextField("Email (optional)", text: $email)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                Picker("Role", selection: $role) {
                    ForEach(roles, id: \.self) { r in
                        Text(r).tag(r)
                    }
                }
                TextField("Spend limit (optional)", text: $limit)
                if let resultMessage, !resultMessage.isEmpty {
                    Text(resultMessage)
                        .font(.caption)
                        .foregroundColor(DesignTokens.business.text)
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("Add member")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel).disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView().tint(accent)
                    } else {
                        Button("Save") { submit() }
                            .foregroundColor(accent)
                    }
                }
            }
        }
        .tint(accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    private func submit() {
        let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        let em = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let body = BusinessBudgetMemberIn(
            initials: nil,
            displayName: name,
            role: role,
            firebaseUid: nil,
            email: em.isEmpty ? nil : em,
            limit: limit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : limit.trimmingCharacters(in: .whitespacesAndNewlines),
            added: true
        )
        onSubmit(body)
    }
}
