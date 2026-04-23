//
//  OTPVerifyView.swift
//  momentra
//
//  OB-MVP-4 — OTP Verify (Figma 158:3).
//

import SwiftUI

struct OTPVerifyView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authManager = AuthManager.shared

    let verificationID: String
    let phoneDisplay: String

    @State private var otpCode = ""
    @State private var focusedBox = 0
    @State private var resendSeconds = 28
    @State private var timerTask: Task<Void, Never>?
    @State private var showError = false
    @State private var errorMessage = ""

    private let brand = DesignTokens.base.brand
    private let muted = DesignTokens.base.onDark60
    private let muted2 = DesignTokens.base.onDark40

    var body: some View {
        ZStack {
            MomentraBase.bg.ignoresSafeArea()

            Circle()
                .fill(brand.opacity(0.12))
                .frame(width: 320, height: 320)
                .offset(y: -200)
                .blur(radius: 36)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Button {
                        dismiss()
                    } label: {
                        Text("←")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(DesignTokens.base.onDark)
                            .frame(width: 36, height: 36)
                            .background(MomentraBase.s200)
                            .cornerRadius(18)
                    }
                    .padding(.leading, 12)
                    .padding(.top, 12)

                    HStack {
                        Spacer()
                        MomentraWordmark(size: 20, dotSize: 5, dotOffsetX: 1, dotOffsetY: -8)
                        Spacer()
                    }
                    .padding(.top, 8)

                    Text("🔐")
                        .font(.system(size: 30))
                        .frame(maxWidth: .infinity)
                        .padding(.top, 12)

                    Text("Verify your number")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(DesignTokens.base.onDark)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)

                    HStack(spacing: 4) {
                        Text(phoneDisplay)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(muted)
                        Button("Change number →") {
                            dismiss()
                        }
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(MomentraBase.brandText)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)

                    ZStack {
                        HStack(spacing: 8) {
                            ForEach(0 ..< 6, id: \.self) { i in
                                ZStack {
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(focusedBox == i ? brand : MomentraBase.s300, lineWidth: focusedBox == i ? 2 : 1)
                                        .background(
                                            RoundedRectangle(cornerRadius: 14)
                                                .fill(i < otpCode.count ? DesignTokens.personal.surface : MomentraBase.s200)
                                        )
                                        .frame(height: 64)

                                    if let ch = digit(at: i) {
                                        Text(ch)
                                            .font(.system(size: 26, weight: .bold))
                                            .foregroundColor(DesignTokens.base.onDark)
                                    } else {
                                        Text("·")
                                            .font(.system(size: 26, weight: .bold))
                                            .foregroundColor(muted2)
                                    }
                                }
                                .onTapGesture { focusedBox = i }
                            }
                        }
                        .padding(.horizontal, 18)

                        TextField("", text: $otpCode)
                            .keyboardType(.numberPad)
                            .textContentType(.oneTimeCode)
                            .opacity(0.02)
                            .padding(.horizontal, 18)
                            .onChange(of: otpCode) { _, new in
                                let d = new.filter(\.isNumber).prefix(6)
                                otpCode = String(d)
                                focusedBox = min(otpCode.count, 5)
                            }
                    }
                    .padding(.top, 20)

                    Text(resendSeconds > 0 ? "Resend OTP in  \(formatResend())" : "You can resend now")
                        .font(.system(size: 13))
                        .foregroundColor(muted)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)

                    HStack(spacing: 6) {
                        Text("🔒")
                        Text("Powered by Firebase Authentication")
                            .font(.system(size: 11))
                            .foregroundColor(muted)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(MomentraBase.s100)
                    .cornerRadius(999)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)

                    Button {
                        Task { await verify() }
                    } label: {
                        ZStack {
                            Text("Verify & Enter App")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundColor(DesignTokens.base.onDark)
                                .opacity(authManager.isLoading ? 0 : 1)
                            if authManager.isLoading {
                                ProgressView().tint(DesignTokens.base.onDark)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(brand)
                        .cornerRadius(16)
                    }
                    .disabled(!canVerify || authManager.isLoading)
                    .opacity(canVerify ? 1 : 0.5)
                    .padding(.horizontal, 18)
                    .padding(.top, 16)

                    HStack(spacing: 8) {
                        Text("✓")
                            .font(.system(size: 14, weight: .bold))
                        Text("No setup. Goes straight to Personal Home.")
                            .font(.system(size: 13))
                    }
                    .foregroundColor(DesignTokens.urgency.cta)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(DesignTokens.group.surface.opacity(0.9))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(DesignTokens.urgency.cta.opacity(0.4), lineWidth: 1)
                    )
                    .cornerRadius(14)
                    .padding(.horizontal, 18)
                    .padding(.top, 12)

                    Text("Then, inside the app — progressive prompts:")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(muted)
                        .padding(.horizontal, 18)
                        .padding(.top, 24)

                    progressiveRow(
                        emoji: "💸",
                        title: "Personal",
                        subtitle: "\"Add your first expense\"",
                        tint: MomentraBase.brandText,
                        bg: DesignTokens.personal.surface
                    )
                    progressiveRow(
                        emoji: "👥",
                        title: "Groups",
                        subtitle: "\"Create your first group\"",
                        tint: DesignTokens.group.text,
                        bg: DesignTokens.group.surface
                    )
                    progressiveRow(
                        emoji: "💼",
                        title: "Business",
                        subtitle: "\"Set up your workspace\"",
                        tint: DesignTokens.business.text,
                        bg: DesignTokens.business.surface
                    )
                    .padding(.bottom, 32)
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            startResendTimer()
        }
        .onDisappear {
            timerTask?.cancel()
        }
        .alert("Verification", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private func digit(at index: Int) -> String? {
        guard index < otpCode.count else { return nil }
        let idx = otpCode.index(otpCode.startIndex, offsetBy: index)
        return String(otpCode[idx])
    }

    private var canVerify: Bool {
        otpCode.count == 6
    }

    private func formatResend() -> String {
        let m = resendSeconds / 60
        let s = resendSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    private func startResendTimer() {
        resendSeconds = 28
        timerTask?.cancel()
        timerTask = Task {
            while resendSeconds > 0 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                resendSeconds -= 1
            }
        }
    }

    private func verify() async {
        guard otpCode.count == 6 else { return }
        showError = false
        do {
            try await authManager.verifyPhoneCode(verificationID: verificationID, code: otpCode)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    private func progressiveRow(
        emoji: String,
        title: String,
        subtitle: String,
        tint: Color,
        bg: Color
    ) -> some View {
        HStack {
            Text(emoji)
                .font(.system(size: 16))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(tint)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundColor(muted)
            }
            Spacer()
            Text("→")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(tint)
        }
        .padding(14)
        .background(bg)
        .cornerRadius(12)
        .padding(.horizontal, 18)
        .padding(.top, 8)
    }
}

#Preview {
    NavigationStack {
        OTPVerifyView(verificationID: "test", phoneDisplay: "+91 98765 43210")
    }
}
