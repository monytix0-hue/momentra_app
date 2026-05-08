//
//  OptionalDefaultsStepView.swift
//  momentra
//

import SwiftUI

struct OptionalDefaultsStepView: View {
    let selectedFocus: PrimaryFocus?
    @Binding var currency: String
    @Binding var organizationName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Optional defaults")
                .font(DesignTokens.type.titleLG)
                .foregroundColor(DesignTokens.base.onDark)

            VStack(alignment: .leading, spacing: 6) {
                Text("Default currency")
                    .font(.system(size: 12))
                    .foregroundColor(DesignTokens.base.onDark60)
                TextField("INR", text: $currency)
                    .textInputAutocapitalization(.characters)
                    .padding(12)
                    .background(MomentraBase.s100)
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.radius.input)
                            .stroke(DesignTokens.base.s300, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .foregroundColor(DesignTokens.base.onDark)
            }

            if selectedFocus == .business {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Organization / Company name")
                        .font(.system(size: 12))
                        .foregroundColor(DesignTokens.base.onDark60)
                    TextField("Acme Inc", text: $organizationName)
                        .padding(12)
                        .background(MomentraBase.s100)
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.radius.input)
                                .stroke(DesignTokens.base.s300, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .foregroundColor(DesignTokens.base.onDark)
                }
            }
        }
    }
}
