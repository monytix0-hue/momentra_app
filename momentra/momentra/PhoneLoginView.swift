//
//  PhoneLoginView.swift
//  momentra
//
//  OB-MVP-3 — Phone Login (Figma 157:3).
//

import AuthenticationServices
import CryptoKit
import Security
import SwiftUI
import UIKit

struct PhoneLoginView: View {
    @StateObject private var authManager = AuthManager.shared
    @State private var nationalNumber = ""
    @State private var showOTP = false
    @State private var verificationID: String?
    @State private var formattedDisplay = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var appleDelegate: SignInWithAppleDelegate?

    private let brand = DesignTokens.base.brand
    private let muted = DesignTokens.base.onDark60
    private let muted2 = DesignTokens.base.onDark40

    var body: some View {
        ZStack {
            MomentraBase.bg.ignoresSafeArea()

            Circle()
                .fill(brand.opacity(0.15))
                .frame(width: 340, height: 340)
                .offset(y: -220)
                .blur(radius: 40)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Spacer()
                        MomentraWordmark(size: 20, dotSize: 5, dotOffsetX: 1, dotOffsetY: -8)
                        Spacer()
                    }
                    .padding(.top, 48)

                    Text("Enter your number")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(DesignTokens.base.onDark)
                        .padding(.horizontal, 18)
                        .padding(.top, 28)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("We'll send a one-time code to verify.")
                            .font(.system(size: 14))
                            .foregroundColor(muted)
                        Text("New users are created automatically.")
                            .font(.system(size: 14))
                            .foregroundColor(muted)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 12)

                    Text("Mobile number")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(muted)
                        .padding(.horizontal, 18)
                        .padding(.top, 24)

                    HStack(spacing: 0) {
                        HStack(spacing: 4) {
                            Text("🇮🇳")
                            Text("+91")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundColor(DesignTokens.base.onDark)
                        .frame(width: 68)
                        .padding(.vertical, 6)
                        .background(MomentraBase.s200)
                        .cornerRadius(12)

                        Rectangle()
                            .fill(MomentraBase.s200)
                            .frame(width: 1, height: 40)
                            .padding(.horizontal, 8)

                        TextField("9876543210", text: $nationalNumber)
                            .keyboardType(.numberPad)
                            .font(.system(size: 17, weight: .medium))
                            .foregroundColor(DesignTokens.base.onDark)
                            .onChange(of: nationalNumber) { _, new in
                                let digits = new.filter(\.isNumber).prefix(10)
                                nationalNumber = String(digits)
                            }
                    }
                    .padding(10)
                    .background(MomentraBase.s200)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(brand, lineWidth: 2)
                    )
                    .cornerRadius(16)
                    .padding(.horizontal, 18)
                    .padding(.top, 4)

                    Button {
                        Task { await sendOTP() }
                    } label: {
                        ZStack {
                            Text("Send OTP")
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
                    .disabled(!canSend || authManager.isLoading)
                    .opacity(canSend ? 1 : 0.45)
                    .padding(.horizontal, 18)
                    .padding(.top, 18)

                    HStack(spacing: 6) {
                        Text("🔒")
                        Text("Secured by Firebase Authentication")
                            .font(.system(size: 11))
                            .foregroundColor(muted)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(MomentraBase.s200)
                    .cornerRadius(999)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 16)

                    orDivider
                        .padding(.top, 20)

                    socialButton(
                        title: "Continue with Google",
                        letter: "G",
                        action: { Task { await signInWithGoogle() } },
                        icon: {
                            Image(systemName: "g.circle.fill")
                        }
                    )

                    socialButton(
                        title: "Continue with Apple",
                        letter: "",
                        action: { startAppleSignIn() },
                        icon: {
                            Image(systemName: "apple.logo")
                        }
                    )

                    Text("By continuing you agree to our Terms of Service and Privacy Policy")
                        .font(.system(size: 11))
                        .foregroundColor(muted2)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 16)
                        .padding(.bottom, 32)
                }
            }
        }
        .navigationBarHidden(true)
        .navigationDestination(isPresented: $showOTP) {
            if let vid = verificationID {
                OTPVerifyView(
                    verificationID: vid,
                    phoneDisplay: formattedDisplay
                )
            }
        }
        .alert("Sign in", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private var canSend: Bool {
        nationalNumber.count == 10
    }

    private var orDivider: some View {
        HStack(alignment: .center) {
            Rectangle()
                .fill(MomentraBase.s300)
                .frame(height: 1)
            Text("or continue with")
                .font(.system(size: 12))
                .foregroundColor(muted)
            Rectangle()
                .fill(MomentraBase.s300)
                .frame(height: 1)
        }
        .padding(.horizontal, 18)
    }

    private func socialButton<T: View>(
        title: String,
        letter: String,
        action: @escaping () -> Void,
        @ViewBuilder icon: () -> T
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                icon()
                    .font(.system(size: 22))
                    .foregroundColor(DesignTokens.base.onDark)
                    .frame(width: 24, height: 24)
                if !letter.isEmpty {
                    Text(letter)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(DesignTokens.base.onDark)
                }
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(DesignTokens.base.onDark)
                Spacer()
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(MomentraBase.s100)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(MomentraBase.s300, lineWidth: 1)
            )
            .cornerRadius(14)
        }
        .padding(.horizontal, 18)
        .padding(.top, 8)
    }

    private func signInWithGoogle() async {
        showError = false
        guard let top = MomentraTopViewController.keyWindowTop() else {
            errorMessage = "Could not present Google sign-in."
            showError = true
            return
        }
        do {
            try await authManager.signInWithGoogle(presenting: top)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    private func sendOTP() async {
        showError = false
        let e164 = "+91" + nationalNumber
        formattedDisplay = "+91 \(nationalNumber.prefix(5)) \(nationalNumber.dropFirst(5))"
        do {
            let vid = try await authManager.sendPhoneVerification(to: e164)
            verificationID = vid
            showOTP = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    private func startAppleSignIn() {
        let nonce = randomNonceString()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)

        let delegate = SignInWithAppleDelegate { result in
            switch result {
            case .success(let credential):
                Task { @MainActor in
                    do {
                        try await authManager.signInWithApple(credential: credential, rawNonce: nonce)
                    } catch {
                        errorMessage = error.localizedDescription
                        showError = true
                    }
                }
            case .failure(let err):
                errorMessage = err.localizedDescription
                showError = true
            }
        }
        appleDelegate = delegate
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = delegate
        controller.presentationContextProvider = delegate
        controller.performRequests()
    }
}

// MARK: - Top view controller (Google Sign-In)

private enum MomentraTopViewController {
    static func keyWindowTop() -> UIViewController? {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first(where: \.isKeyWindow)?.rootViewController
        else { return nil }
        var top = root
        while let presented = top.presentedViewController {
            top = presented
        }
        return top
    }
}

// MARK: - Sign in with Apple

private enum AppleSignInResult {
    case success(ASAuthorizationAppleIDCredential)
    case failure(Error)
}

private final class SignInWithAppleDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private let onCompletion: (AppleSignInResult) -> Void

    init(onCompletion: @escaping (AppleSignInResult) -> Void) {
        self.onCompletion = onCompletion
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? UIWindow()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let cred = authorization.credential as? ASAuthorizationAppleIDCredential {
            onCompletion(.success(cred))
        } else {
            onCompletion(.failure(NSError(domain: "momentra", code: 0, userInfo: [NSLocalizedDescriptionKey: "Unexpected Apple credential"])))
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        onCompletion(.failure(error))
    }
}

// MARK: - Nonce (Firebase Apple sign-in)

private func randomNonceString(length: Int = 32) -> String {
    precondition(length > 0)
    let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var result = ""
    var remaining = length
    while remaining > 0 {
        let randoms: [UInt8] = (0 ..< 16).map { _ in
            var random: UInt8 = 0
            let err = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            if err != errSecSuccess {
                fatalError("SecRandomCopyBytes failed \(err)")
            }
            return random
        }
        for random in randoms {
            if remaining == 0 { break }
            if random < charset.count {
                result.append(charset[Int(random)])
                remaining -= 1
            }
        }
    }
    return result
}

private func sha256(_ input: String) -> String {
    let data = Data(input.utf8)
    let hash = SHA256.hash(data: data)
    return hash.compactMap { String(format: "%02x", $0) }.joined()
}

#Preview {
    NavigationStack {
        PhoneLoginView()
    }
}
