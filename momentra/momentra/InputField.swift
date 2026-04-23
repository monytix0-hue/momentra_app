//
//  InputField.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct InputField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    
    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacing.item) {
            Text(label)
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(DesignTokens.base.onDark)
            
            TextField(placeholder, text: $text)
                .font(DesignTokens.type.body)
                .foregroundColor(DesignTokens.base.onDark)
                .keyboardType(keyboardType)
                .textInputAutocapitalization(autocapitalization)
                .padding(DesignTokens.spacing.cardH)
                .background(DesignTokens.base.s100)
                .cornerRadius(DesignTokens.radius.input)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.radius.input)
                        .stroke(DesignTokens.base.s300, lineWidth: 1)
                )
        }
    }
}

struct SecureInputField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    @Binding var isVisible: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.spacing.item) {
            Text(label)
                .font(DesignTokens.type.bodyMedium)
                .foregroundColor(DesignTokens.base.onDark)
            
            HStack(spacing: DesignTokens.spacing.item) {
                if isVisible {
                    TextField(placeholder, text: $text)
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark)
                        .textInputAutocapitalization(.never)
                } else {
                    SecureField(placeholder, text: $text)
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark)
                        .textInputAutocapitalization(.never)
                }
                
                Button {
                    isVisible.toggle()
                } label: {
                    Image(systemName: isVisible ? "eye.slash.fill" : "eye.fill")
                        .foregroundColor(DesignTokens.base.onDark.opacity(0.4))
                }
            }
            .padding(DesignTokens.spacing.cardH)
            .background(DesignTokens.base.s100)
            .cornerRadius(DesignTokens.radius.input)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.radius.input)
                    .stroke(DesignTokens.base.s300, lineWidth: 1)
            )
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        InputField(
            label: "Email",
            placeholder: "you@example.com",
            text: .constant(""),
            keyboardType: .emailAddress
        )
        
        SecureInputField(
            label: "Password",
            placeholder: "Enter password",
            text: .constant(""),
            isVisible: .constant(false)
        )
    }
    .padding()
    .momentraBackground()
}
