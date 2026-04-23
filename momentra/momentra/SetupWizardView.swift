//
//  SetupWizardView.swift
//  momentra
//

import SwiftUI

struct SetupWizardView: View {
    @ObservedObject private var auth = AuthManager.shared
    @State private var step = 1
    @State private var focus: PrimaryFocus?
    @State private var currency = "INR"
    @State private var organizationName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    private var context: MomentraContext {
        switch focus {
        case .group: return .group
        case .business: return .business
        default: return .personal
        }
    }
    
    private var theme: ContextTheme { DesignTokens.theme(for: context) }

    var body: some View {
        ZStack(alignment: .top) {
            MomentraBase.bg.ignoresSafeArea()
            Rectangle()
                .fill(theme.headerGradient)
                .frame(height: 132)
                .frame(maxHeight: .infinity, alignment: .top)
            Circle()
                .fill(theme.accent.opacity(theme.orbOpacity))
                .frame(width: 340, height: 340)
                .offset(y: -110)
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Setup")
                        .font(DesignTokens.type.display)
                        .foregroundColor(DesignTokens.base.onDark)

                    if step == 1 {
                        PrimaryFocusStepView(selected: $focus)
                    } else {
                        OptionalDefaultsStepView(
                            selectedFocus: focus,
                            currency: $currency,
                            organizationName: $organizationName
                        )
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(DesignTokens.type.caption)
                            .foregroundColor(MomentraUrgency.high)
                    }

                    HStack {
                        if step == 2 {
                            Button("Back") { step = 1 }
                                .font(DesignTokens.type.bodyMedium)
                                .foregroundColor(DesignTokens.base.onDark)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 10)
                                .background(DesignTokens.base.s200)
                                .clipShape(Capsule())
                        }
                        Spacer()
                        Button(step == 1 ? "Next" : (isSaving ? "Saving..." : "Finish")) {
                            Task { await onContinue() }
                        }
                        .font(DesignTokens.type.bodyMedium)
                        .disabled(isSaving)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(theme.ctaGradient)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.button))
                        .foregroundColor(DesignTokens.semantic.ctaText)
                    }
                }
                .padding(.horizontal, DesignTokens.spacing.screenH)
                .padding(.vertical, DesignTokens.spacing.screenV)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func onContinue() async {
        errorMessage = nil
        if step == 1 {
            guard focus != nil else {
                errorMessage = "Please choose your primary focus."
                return
            }
            step = 2
            return
        }
        guard let focus else {
            errorMessage = "Please choose your primary focus."
            step = 1
            return
        }
        if focus == .business && organizationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Organization name is required for Business focus."
            return
        }
        isSaving = true
        do {
            try await auth.syncSetupProfile(
                primaryFocus: focus,
                defaultCurrency: currency.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "INR" : currency,
                organizationName: organizationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : organizationName
            )
            isSaving = false
        } catch {
            isSaving = false
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

#Preview {
    SetupWizardView()
}
