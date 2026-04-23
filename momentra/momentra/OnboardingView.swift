//
//  OnboardingView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

struct OnboardingView: View {
    @State private var currentPage = 0
    @State private var shouldShowAuth = false
    
    let pages: [OnboardingPage] = [
        OnboardingPage(
            title: "Together. Forward.",
            description: "Pool money with friends, track shared expenses, and reach your goals faster.",
            imageName: "onboarding.1",
            gradient: LinearGradient(
                colors: [DesignTokens.personal.accent, DesignTokens.personal.accentEnd],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        ),
        OnboardingPage(
            title: "Every Rupee Counts",
            description: "See exactly who paid what. Split bills fairly. Stay organized.",
            imageName: "onboarding.2",
            gradient: LinearGradient(
                colors: [DesignTokens.group.accent, DesignTokens.group.accentEnd],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        ),
        OnboardingPage(
            title: "Dreams, Delivered",
            description: "From weekend trips to big purchases — save together, celebrate together.",
            imageName: "onboarding.3",
            gradient: LinearGradient(
                colors: [DesignTokens.business.accent, DesignTokens.business.accentEnd],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    ]
    
    var body: some View {
        ZStack {
            DesignTokens.base.bg.ignoresSafeArea()
            
            if shouldShowAuth {
                AuthRootView()
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing),
                        removal: .move(edge: .leading)
                    ))
            } else {
                onboardingContent
                    .transition(.asymmetric(
                        insertion: .move(edge: .leading),
                        removal: .move(edge: .trailing)
                    ))
            }
        }
        .animation(.easeInOut(duration: DesignTokens.anim.medium), value: shouldShowAuth)
    }
    
    private var onboardingContent: some View {
        VStack(spacing: 0) {
            // Skip button
            HStack {
                Spacer()
                Button {
                    withAnimation {
                        shouldShowAuth = true
                    }
                } label: {
                    Text("Skip")
                        .font(DesignTokens.type.body)
                        .foregroundColor(DesignTokens.base.onDark.opacity(0.6))
                }
                .padding(.trailing, DesignTokens.spacing.screenH)
                .padding(.top, DesignTokens.spacing.screenV)
            }
            
            // Tab view with pages
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    OnboardingPageView(page: pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            
            // Page indicator
            HStack(spacing: 8) {
                ForEach(0..<pages.count, id: \.self) { index in
                    Circle()
                        .fill(currentPage == index ? DesignTokens.base.brand : DesignTokens.base.s300)
                        .frame(width: currentPage == index ? 24 : 8, height: 8)
                        .animation(.spring(response: 0.3), value: currentPage)
                }
            }
            .padding(.bottom, DesignTokens.spacing.screenV)
            
            // CTA Button
            Button {
                if currentPage < pages.count - 1 {
                    withAnimation {
                        currentPage += 1
                    }
                } else {
                    withAnimation {
                        shouldShowAuth = true
                    }
                }
            } label: {
                Text(currentPage < pages.count - 1 ? "Next" : "Get Started")
                    .font(DesignTokens.type.label)
                    .foregroundColor(DesignTokens.base.onDark)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(DesignTokens.personal.ctaGradient)
                    .cornerRadius(DesignTokens.radius.button)
            }
            .padding(.horizontal, DesignTokens.spacing.screenH)
            .padding(.bottom, DesignTokens.spacing.screenV)
        }
    }
}

// MARK: - Onboarding Page Model

struct OnboardingPage {
    let title: String
    let description: String
    let imageName: String
    let gradient: LinearGradient
}

// MARK: - Onboarding Page View

struct OnboardingPageView: View {
    let page: OnboardingPage
    
    var body: some View {
        VStack(spacing: DesignTokens.spacing.section) {
            Spacer()
            
            // Illustration
            ZStack {
                // Gradient background
                Circle()
                    .fill(page.gradient)
                    .frame(width: 280, height: 280)
                    .blur(radius: 60)
                    .opacity(0.3)
                
                // Placeholder for illustration
                // Replace with actual images from Figma
                Image(systemName: "figure.walk.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 200, height: 200)
                    .foregroundStyle(page.gradient)
            }
            .frame(height: 300)
            
            Spacer()
            
            // Title
            Text(page.title)
                .font(DesignTokens.type.titleXL)
                .foregroundColor(DesignTokens.base.onDark)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.spacing.screenH)
            
            // Description
            Text(page.description)
                .font(DesignTokens.type.body)
                .foregroundColor(DesignTokens.base.onDark.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.spacing.screenH * 2)
                .fixedSize(horizontal: false, vertical: true)
            
            Spacer()
        }
    }
}

#Preview {
    OnboardingView()
}
