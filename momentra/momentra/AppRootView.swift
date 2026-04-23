//
//  AppRootView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct AppRootView: View {
    @StateObject private var authManager = AuthManager.shared
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showSplash = true
    
    var body: some View {
        ZStack {
            NavigationStack {
                if authManager.isAuthenticated {
                    if authManager.meProfile?.setupCompleted == true {
                        ContextRouterView()
                    } else {
                        SetupWizardView()
                    }
                } else {
                    if hasCompletedOnboarding {
                        AuthRootView()
                    } else {
                        OnboardingMVPView(
                            onGetStarted: { hasCompletedOnboarding = true },
                            onSignIn: { hasCompletedOnboarding = true }
                        )
                    }
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
        .task {
            // Check auth state on app launch
            await authManager.checkAuthState()
        }
    }
}

#Preview {
    AppRootView()
}
