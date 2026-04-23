//
//  PrimaryFocusStepView.swift
//  momentra
//

import SwiftUI

struct PrimaryFocusStepView: View {
    @Binding var selected: PrimaryFocus?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("What is your primary focus?")
                .font(DesignTokens.type.titleLG)
                .foregroundColor(DesignTokens.base.onDark)

            optionCard(.personal, title: "I track money for myself")
            optionCard(.group, title: "I track expenses with friends/partners")
            optionCard(.business, title: "I track money for my job/company")
        }
    }

    private func optionCard(_ focus: PrimaryFocus, title: String) -> some View {
        let isSelected = selected == focus
        let context: MomentraContext = {
            switch focus {
            case .personal: return .personal
            case .group: return .group
            case .business: return .business
            }
        }()
        let theme = DesignTokens.theme(for: context)
        return Button {
            selected = focus
        } label: {
            HStack {
                Text(title)
                    .font(DesignTokens.type.bodyMedium)
                    .foregroundColor(isSelected ? theme.text : DesignTokens.base.onDark60)
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? theme.accent : DesignTokens.base.onDark40)
            }
            .padding(14)
            .background(isSelected ? theme.surface : MomentraBase.s100)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.radius.input)
                    .stroke(isSelected ? theme.accent : DesignTokens.base.s300, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}
