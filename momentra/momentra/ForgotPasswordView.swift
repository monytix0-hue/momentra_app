//
//  ForgotPasswordView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authManager = AuthManager.shared
    
    @State private var email = ""
    @State private var isLoading = false
    @State private var showSuccess = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var isFormValid: Bool {
        !email.isEmpty && email.contains("@")
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.spacing.screenV) {
                    // Header
                    VStack(alignment: .leading, spacing: DesignTokens.spacing.item) {
                        Text("Reset Password")
                            .font(DesignTokens.type.titleXL)
                            .foregroundColor(DesignTokens.base.onDark)
                        
                        Text("Enter your email address and we'll send you a link to reset your password")
                            .font(DesignTokens.type.body)
                            .foregroundColor(DesignTokens.base.onDark.opacity(0.7))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, DesignTokens.spacing.screenV)
                    
                    // Email field
                    InputField(
                        label: "Email",
                        placeholder: "you@example.com",
                        text: $email,
                        keyboardType: .emailAddress
                    )
                    
                    // Success message
                    if showSuccess {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(DesignTokens.urgency.cta)
                            Text("Password reset email sent! Check your inbox.")
                                .font(DesignTokens.type.caption)
                                .foregroundColor(DesignTokens.urgency.ctaText)
                        }
                        .padding(DesignTokens.spacing.section)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(DesignTokens.urgency.paidBg)
                        .cornerRadius(DesignTokens.radius.input)
                    }
                    
                    // Error message
                    if showError {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(DesignTokens.urgency.high)
                            Text(errorMessage)
                                .font(DesignTokens.type.caption)
                                .foregroundColor(DesignTokens.urgency.highText)
                        }
                        .padding(DesignTokens.spacing.section)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(DesignTokens.urgency.highSurface)
                        .cornerRadius(DesignTokens.radius.input)
                    }
                    
                    // Send button
                    Button {
                        Task {
                            await sendResetEmail()
                        }
                    } label: {
                        ZStack {
                            Text("Send Reset Link")
                                .font(DesignTokens.type.label)
                                .foregroundColor(DesignTokens.base.onDark)
                                .opacity(isLoading ? 0 : 1)
                            
                            if isLoading {
                                ProgressView()
                                    .tint(DesignTokens.base.onDark)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(isFormValid ? DesignTokens.personal.ctaGradient : LinearGradient(colors: [DesignTokens.base.s200], startPoint: .leading, endPoint: .trailing))
                        .cornerRadius(DesignTokens.radius.button)
                    }
                    .disabled(!isFormValid || isLoading)
                    .padding(.top, DesignTokens.spacing.section)
                    
                    // Back to sign in
                    Button {
                        dismiss()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Back to Sign In")
                        }
                        .font(DesignTokens.type.bodyMedium)
                        .foregroundColor(DesignTokens.base.brand)
                    }
                    .padding(.top, DesignTokens.spacing.section)
                }
                .padding(.horizontal, DesignTokens.spacing.screenH)
            }
            .momentraBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundColor(DesignTokens.base.onDark)
                    }
                }
            }
        }
    }
    
    private func sendResetEmail() async {
        isLoading = true
        showError = false
        showSuccess = false
        
        do {
            try await authManager.resetPassword(email: email)
            showSuccess = true
            isLoading = false
            
            // Auto dismiss after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                dismiss()
            }
        } catch {
            errorMessage = "Failed to send reset email. Please try again."
            showError = true
            isLoading = false
        }
    }
}

#Preview {
    ForgotPasswordView()
}
