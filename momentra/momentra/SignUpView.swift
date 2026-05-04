//
//  SignUpView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authManager = AuthManager.shared
    
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var agreeToTerms = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var isPasswordVisible = false
    @State private var isConfirmPasswordVisible = false
    
    var isFormValid: Bool {
        !name.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 6 &&
        agreeToTerms
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.spacing.screenV) {
                // Header
                VStack(alignment: .leading, spacing: DesignTokens.spacing.item) {
                    Text("Create Account")
                        .font(DesignTokens.type.titleXL)
                        .foregroundColor(DesignTokens.base.onDark)
                    
                    Text("Join Momentra and start saving together")
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark.opacity(0.6))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, DesignTokens.spacing.screenV)
                
                // Form fields
                VStack(spacing: DesignTokens.spacing.section) {
                    // Name field
                    InputField(
                        label: "Full Name",
                        placeholder: "Enter your name",
                        text: $name,
                        keyboardType: .default
                    )
                    
                    // Email field
                    InputField(
                        label: "Email",
                        placeholder: "you@example.com",
                        text: $email,
                        keyboardType: .emailAddress
                    )
                    
                    // Password field
                    SecureInputField(
                        label: "Password",
                        placeholder: "At least 6 characters",
                        text: $password,
                        isVisible: $isPasswordVisible
                    )
                    
                    // Confirm password field
                    SecureInputField(
                        label: "Confirm Password",
                        placeholder: "Re-enter password",
                        text: $confirmPassword,
                        isVisible: $isConfirmPasswordVisible
                    )
                    
                    // Password match indicator
                    if !password.isEmpty && !confirmPassword.isEmpty {
                        HStack(spacing: 6) {
                            Image(systemName: password == confirmPassword ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundColor(password == confirmPassword ? DesignTokens.urgency.cta : DesignTokens.urgency.high)
                            Text(password == confirmPassword ? "Passwords match" : "Passwords don't match")
                                .font(DesignTokens.type.caption)
                                .foregroundColor(password == confirmPassword ? DesignTokens.urgency.cta : DesignTokens.urgency.high)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                
                // Terms checkbox
                Button {
                    agreeToTerms.toggle()
                } label: {
                    HStack(spacing: DesignTokens.spacing.item) {
                        Image(systemName: agreeToTerms ? "checkmark.square.fill" : "square")
                            .foregroundColor(agreeToTerms ? DesignTokens.base.brand : DesignTokens.base.s300)
                            .font(.system(size: 22))
                        
                        Text("I agree to the ")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(DesignTokens.base.onDark.opacity(0.7))
                        +
                        Text("Terms & Conditions")
                            .font(DesignTokens.type.caption)
                            .foregroundColor(DesignTokens.base.brand)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.top, DesignTokens.spacing.item)
                
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
                
                // Sign Up button
                Button {
                    Task {
                        await signUp()
                    }
                } label: {
                    ZStack {
                        Text("Create Account")
                            .font(DesignTokens.type.label)
                            .foregroundColor(DesignTokens.base.onDark)
                            .opacity(authManager.isLoading ? 0 : 1)
                        
                        if authManager.isLoading {
                            ProgressView()
                                .tint(DesignTokens.base.onDark)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(isFormValid ? DesignTokens.personal.ctaGradient : LinearGradient(colors: [DesignTokens.base.s200], startPoint: .leading, endPoint: .trailing))
                    .cornerRadius(DesignTokens.radius.button)
                }
                .disabled(!isFormValid || authManager.isLoading)
                .padding(.top, DesignTokens.spacing.section)
                
                // Sign in link
                HStack(spacing: 4) {
                    Text("Already have an account?")
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark.opacity(0.6))
                    
                    Button {
                        dismiss()
                    } label: {
                        Text("Sign In")
                            .font(DesignTokens.type.bodyMedium)
                            .foregroundColor(DesignTokens.base.brand)
                    }
                }
                .padding(.bottom, DesignTokens.spacing.screenV)
            }
            .padding(.horizontal, DesignTokens.spacing.screenH)
        }
        .momentraBackground()
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundColor(DesignTokens.base.onDark)
                }
            }
        }
    }
    
    private func signUp() async {
        showError = false
        
        do {
            try await authManager.signUp(email: email, password: password, name: name)
            // Success - AuthManager will update isAuthenticated
        } catch let error as AuthError {
            errorMessage = error.localizedDescription
            showError = true
        } catch {
            errorMessage = "An unexpected error occurred"
            showError = true
        }
    }
}

#Preview {
    NavigationStack {
        SignUpView()
    }
}
