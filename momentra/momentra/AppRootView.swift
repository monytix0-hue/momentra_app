//
//  AppRootView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct AppRootView: View {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var momentraTheme = MomentraTheme()
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showSplash = true
    
    var body: some View {
        let route: AppRoute = if authManager.isAuthenticated {
            authManager.meProfile?.setupCompleted == true ? .main : .onboarding
        } else {
            hasCompletedOnboarding ? .auth : .onboarding
        }

        ZStack {
            NavigationStack {
                switch route {
                case .main:
                    MainShellView()
                case .onboarding:
                    if authManager.isAuthenticated {
                        SetupWizardView()
                    } else {
                        OnboardingMVPView(
                            onGetStarted: { hasCompletedOnboarding = true },
                            onSignIn: { hasCompletedOnboarding = true }
                        )
                    }
                case .auth:
                    AuthRootView()
                case .splash:
                    EmptyView()
                }
            }
            .opacity(showSplash ? 0 : 1)
            
            // Splash screen
            if showSplash {
                LaunchScreenView(onFinish: {
                    showSplash = false
                })
                .transition(.opacity)
                .zIndex(1)
            }
        }
        .animation(.easeOut(duration: 0.3), value: showSplash)
        .environmentObject(momentraTheme)
        .task {
            // Check auth state on app launch
            await authManager.checkAuthState()
        }
    }
}

#Preview {
    AppRootView()
}
