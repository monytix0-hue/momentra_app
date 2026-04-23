//
//  SignInView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct SignInView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authManager = AuthManager.shared
    
    @State private var email = ""
    @State private var password = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var isPasswordVisible = false
    @State private var showForgotPassword = false
    
    var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.spacing.screenV) {
                // Header
                VStack(alignment: .leading, spacing: DesignTokens.spacing.item) {
                    Text("Welcome Back")
                        .font(DesignTokens.type.titleXL)
                        .foregroundColor(DesignTokens.base.onDark)
                    
                    Text("Sign in to continue to Momentra")
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark.opacity(0.6))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, DesignTokens.spacing.screenV * 2)
                
                // Form fields
                VStack(spacing: DesignTokens.spacing.section) {
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
                        placeholder: "Enter your password",
                        text: $password,
                        isVisible: $isPasswordVisible
                    )
                    
                    // Forgot password
                    Button {
                        showForgotPassword = true
                    } label: {
                        Text("Forgot Password?")
                            .font(DesignTokens.type.bodyMedium)
                            .foregroundColor(DesignTokens.base.brand)
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
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
                
                // Sign In button
                Button {
                    Task {
                        await signIn()
                    }
                } label: {
                    ZStack {
                        Text("Sign In")
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
                
                // Sign up link
                HStack(spacing: 4) {
                    Text("Don't have an account?")
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark.opacity(0.6))
                    
                    Button {
                        dismiss()
                    } label: {
                        Text("Sign Up")
                            .font(DesignTokens.type.bodyMedium)
                            .foregroundColor(DesignTokens.base.brand)
                    }
                }
                .padding(.top, DesignTokens.spacing.section)
                
                Spacer()
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
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordView()
        }
    }
    
    private func signIn() async {
        showError = false
        
        do {
            try await authManager.signIn(email: email, password: password)
            // Success - AuthManager will update isAuthenticated
        } catch let error as AuthError {
            errorMessage = error.localizedDescription ?? "Sign in failed"
            showError = true
        } catch {
            errorMessage = "An unexpected error occurred"
            showError = true
        }
    }
}

#Preview {
    NavigationStack {
        SignInView()
    }
}
