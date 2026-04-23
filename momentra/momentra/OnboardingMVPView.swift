//
//  OnboardingMVPView.swift
//  momentra
//
//  OB-MVP-2 — Onboarding (Figma 156:3): single screen, one headline.
//

import SwiftUI

struct OnboardingMVPView: View {
    var onGetStarted: () -> Void
    var onSignIn: () -> Void

    private let ember = DesignTokens.splash.ember
    private let brand = DesignTokens.base.brand
    private let muted = DesignTokens.base.onDark60
    private let muted2 = DesignTokens.base.onDark40

    var body: some View {
        ZStack {
            MomentraBase.bg.ignoresSafeArea()

            Circle()
                .fill(ember.opacity(0.12))
                .frame(width: 380, height: 380)
                .offset(x: -40, y: -280)
                .blur(radius: 50)

            Circle()
                .fill(brand.opacity(0.08))
                .frame(width: 400, height: 400)
                .offset(x: 120, y: 320)
                .blur(radius: 60)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .top, spacing: 8) {
                        MarkCanvas(
                            dotsVisible: [true, true, true, true, true],
                            ghostOpacity: 1,
                            peakProgress: 1,
                            arcOpacity: 1,
                            sparkScale: 1,
                            sparkOpacity: 1,
                            soft: DesignTokens.base.onDark,
                            ember: ember,
                            amber: DesignTokens.splash.amber
                        )
                        .frame(width: 44, height: 44)

                        VStack(alignment: .leading, spacing: 2) {
                            MomentraWordmark(size: 18, dotSize: 5, dotOffsetX: 1, dotOffsetY: -8)
                            Spacer(minLength: 0)
                        }
                        .padding(.top, 2)

                        Spacer()
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 24)

                    previewCard
                        .padding(.horizontal, 18)
                        .padding(.top, 16)

                    headlineBlock
                        .padding(.horizontal, 18)
                        .padding(.top, 20)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(brand)
                        .frame(width: 24, height: 8)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 16)

                    Button(action: onGetStarted) {
                        Text("Get Started")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(DesignTokens.base.onDark)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(brand)
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 20)

                    Button(action: onSignIn) {
                        Text("Already have an account?  Sign in")
                            .font(.system(size: 13))
                            .foregroundColor(muted)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.top, 14)

                    Text("🔒  No card needed · Private · Free to start")
                        .font(.system(size: 11))
                        .foregroundColor(muted2)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                }
            }
        }
    }

    private var previewCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                MomentraBase.s100
                DesignTokens.base.brand.opacity(0.05)

                VStack(alignment: .leading, spacing: 8) {
                    Text("₹1,24,500")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(DesignTokens.base.onDark)

                    Text("Net balance · May 2025")
                        .font(.system(size: 11))
                        .foregroundColor(muted)

                    HStack(spacing: 8) {
                        pill("Personal", DesignTokens.personal.surface, DesignTokens.personal.text)
                        pill("Groups", DesignTokens.group.surface, DesignTokens.group.text)
                        pill("Business", DesignTokens.business.surface, DesignTokens.business.text)
                    }
                    .padding(.top, 4)

                    VStack(spacing: 8) {
                        txnRow(icon: "🍽", title: "Dinner — Social Kitchen", amount: "-₹840", positive: false)
                        txnRow(icon: "🛒", title: "DMart Groceries", amount: "-₹2,100", positive: false)
                        txnRow(icon: "💰", title: "Salary — May", amount: "+₹85,000", positive: true)
                    }
                    .padding(.top, 12)
                }
                .padding(20)
            }
            .cornerRadius(24)

            HStack {
                Text("Goa Trip Fund  ·  4 members  ·  ₹38,500 raised")
                    .font(.system(size: 12))
                    .foregroundColor(muted)
                Spacer()
                Text("77%")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DesignTokens.urgency.cta)
            }
            .padding(14)
            .background(
                ZStack {
                    MomentraBase.s100
                    DesignTokens.urgency.cta.opacity(0.06)
                }
            )
            .cornerRadius(14)
            .padding(.top, 12)
        }
    }

    private func pill(_ title: String, _ bg: Color, _ fg: Color) -> some View {
        Text(title)
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(fg)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(bg)
            .cornerRadius(999)
    }

    private func txnRow(icon: String, title: String, amount: String, positive: Bool) -> some View {
        HStack {
            Text(icon)
                .font(.system(size: 14))
            Text(title)
                .font(.system(size: 11))
                .foregroundColor(muted)
            Spacer()
            Text(amount)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(positive ? DesignTokens.urgency.cta : DesignTokens.urgency.high)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 10)
        .background(MomentraBase.s200)
        .cornerRadius(10)
    }

    private var headlineBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your money,\nall in one place.")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(DesignTokens.base.onDark)
                .lineSpacing(4)

            Text("Track expenses, split with friends,\nand manage business budgets.")
                .font(.system(size: 15))
                .foregroundColor(muted)
        }
    }
}

#Preview {
    OnboardingMVPView(onGetStarted: {}, onSignIn: {})
}
