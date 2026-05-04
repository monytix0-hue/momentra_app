//
//  AuthManager.swift
//  momentra
//
//  Firebase Auth (phone, Apple, email) + backend token exchange.
//

import AuthenticationServices
import Combine
import Foundation
import FirebaseAuth
import FirebaseCore
import GoogleSignIn
#if canImport(UIKit)
import UIKit
#endif

enum AuthError: Error, LocalizedError {
    case invalidCredentials
    case userNotFound
    case emailAlreadyInUse
    case weakPassword
    case networkError
    case tokenExchangeFailed
    case missingVerificationID
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .userNotFound:
            return "No account found with this email"
        case .emailAlreadyInUse:
            return "This email is already registered"
        case .weakPassword:
            return "Password must be at least 6 characters"
        case .networkError:
            return "Network connection error"
        case .tokenExchangeFailed:
            return "Failed to connect to server"
        case .missingVerificationID:
            return "Missing phone verification"
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}

@MainActor
class AuthManager: ObservableObject {
    @Published var currentUser: MomentraUser?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: AuthError?
    @Published var meProfile: MeResponse?

    /// Firebase Auth user id (matches `team_members.firebase_uid` on business budgets).
    var firebaseUid: String? {
        Auth.auth().currentUser?.uid
    }

    private var accessToken: String?
    private var refreshToken: String?

    static let shared = AuthManager()

#if canImport(UIKit)
    private let phoneUIDelegate = MomentraPhoneAuthUIDelegate()
#endif

    private init() {
        if Auth.auth().currentUser != nil {
            Task { await checkAuthState() }
        }
    }

    func checkAuthState() async {
        guard let firebaseUser = Auth.auth().currentUser else {
            isAuthenticated = false
            currentUser = nil
            return
        }

        do {
            try await applyExchange(for: firebaseUser)
        } catch {
            print("Failed to exchange token: \(error)")
            isAuthenticated = true
        }
    }

    // MARK: - Phone (OB-MVP-3 / OB-MVP-4)

    func sendPhoneVerification(to phoneE164: String) async throws -> String {
        isLoading = true
        error = nil
        defer { isLoading = false }

        return try await withCheckedThrowingContinuation { continuation in
#if canImport(UIKit)
            PhoneAuthProvider.provider()
                .verifyPhoneNumber(phoneE164, uiDelegate: phoneUIDelegate) { verificationID, err in
                    if let err = err {
                        continuation.resume(throwing: err)
                        return
                    }
                    guard let verificationID = verificationID else {
                        continuation.resume(throwing: AuthError.missingVerificationID)
                        return
                    }
                    continuation.resume(returning: verificationID)
                }
#else
            continuation.resume(throwing: AuthError.networkError)
#endif
        }
    }

    func verifyPhoneCode(verificationID: String, code: String) async throws {
        isLoading = true
        error = nil
        do {
            let credential = PhoneAuthProvider.provider()
                .credential(withVerificationID: verificationID, verificationCode: code)
            let result = try await Auth.auth().signIn(with: credential)
            try await applyExchange(for: result.user)
            isLoading = false
        } catch {
            isLoading = false
            if let ne = error as NSError?, ne.domain == AuthErrorDomain {
                self.error = .invalidCredentials
                throw AuthError.invalidCredentials
            }
            self.error = .unknown(error)
            throw AuthError.unknown(error)
        }
    }

    // MARK: - Google

#if canImport(UIKit)
    func signInWithGoogle(presenting viewController: UIViewController) async throws {
        isLoading = true
        error = nil
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            isLoading = false
            let err = NSError(domain: "momentra", code: -2, userInfo: [NSLocalizedDescriptionKey: "Missing Firebase client ID"])
            error = .unknown(err)
            throw err
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)

        do {
            let signInResult = try await GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
            guard let idToken = signInResult.user.idToken?.tokenString else {
                isLoading = false
                error = .invalidCredentials
                throw AuthError.invalidCredentials
            }
            let accessToken = signInResult.user.accessToken.tokenString
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
            let result = try await Auth.auth().signIn(with: credential)
            try await applyExchange(for: result.user)
            isLoading = false
        } catch {
            isLoading = false
            self.error = .unknown(error)
            throw error
        }
    }
#endif

    // MARK: - Sign in with Apple

    func signInWithApple(credential: ASAuthorizationAppleIDCredential, rawNonce: String) async throws {
        isLoading = true
        error = nil
        guard let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8)
        else {
            isLoading = false
            error = .invalidCredentials
            throw AuthError.invalidCredentials
        }

        do {
            let oauthCredential = OAuthProvider.appleCredential(
                withIDToken: idToken,
                rawNonce: rawNonce,
                fullName: credential.fullName
            )
            let result = try await Auth.auth().signIn(with: oauthCredential)
            try await applyExchange(for: result.user)
            isLoading = false
        } catch {
            isLoading = false
            self.error = .unknown(error)
            throw error
        }
    }

    // MARK: - Email (legacy)

    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            try await applyExchange(for: result.user)
            isLoading = false
        } catch let authError as NSError {
            isLoading = false
            switch AuthErrorCode(rawValue: authError.code) {
            case .wrongPassword, .invalidEmail:
                error = .invalidCredentials
                throw AuthError.invalidCredentials
            case .userNotFound:
                error = .userNotFound
                throw AuthError.userNotFound
            case .networkError:
                error = .networkError
                throw AuthError.networkError
            default:
                error = .unknown(authError)
                throw AuthError.unknown(authError)
            }
        } catch is NetworkError {
            isLoading = false
            error = .tokenExchangeFailed
            throw AuthError.tokenExchangeFailed
        } catch let err {
            isLoading = false
            error = .unknown(err)
            throw AuthError.unknown(err)
        }
    }

    func signUp(email: String, password: String, name: String) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = name
            try await changeRequest.commitChanges()
            try await applyExchange(for: result.user)
            isLoading = false
        } catch let authError as NSError {
            isLoading = false
            switch AuthErrorCode(rawValue: authError.code) {
            case .emailAlreadyInUse:
                error = .emailAlreadyInUse
                throw AuthError.emailAlreadyInUse
            case .weakPassword:
                error = .weakPassword
                throw AuthError.weakPassword
            case .networkError:
                error = .networkError
                throw AuthError.networkError
            default:
                error = .unknown(authError)
                throw AuthError.unknown(authError)
            }
        } catch is NetworkError {
            isLoading = false
            error = .tokenExchangeFailed
            throw AuthError.tokenExchangeFailed
        } catch let err {
            isLoading = false
            error = .unknown(err)
            throw AuthError.unknown(err)
        }
    }

    func signOut() throws {
        try Auth.auth().signOut()
        currentUser = nil
        accessToken = nil
        refreshToken = nil
        isAuthenticated = false
    }

    func getAccessToken() -> String? {
        accessToken
    }

    func refreshMeProfile() async throws {
        guard let token = accessToken, !token.isEmpty else {
            throw NetworkError.unauthorized
        }
        let me: MeResponse = try await NetworkService.shared.request(
            endpoint: "/me",
            token: token
        )
        meProfile = me
    }

    func syncSetupProfile(
        primaryFocus: PrimaryFocus,
        defaultCurrency: String?,
        organizationName: String?
    ) async throws {
        guard let token = accessToken, !token.isEmpty else {
            throw NetworkError.unauthorized
        }
        let body = SyncUserProfileRequest(
            displayName: nil,
            photoURL: nil,
            upiOrPhone: nil,
            primaryUse: nil,
            primaryFocus: primaryFocus.rawValue,
            defaultCurrency: defaultCurrency,
            organizationName: organizationName,
            setupCompleted: true
        )
        let _: [String: String] = try await NetworkService.shared.request(
            endpoint: "/users/sync",
            method: "POST",
            body: body,
            token: token
        )
        try await refreshMeProfile()
    }

    func resetPassword(email: String) async throws {
        try await Auth.auth().sendPasswordReset(withEmail: email)
    }

    // MARK: - Backend session

    private func applyExchange(for firebaseUser: User) async throws {
        let idToken = try await firebaseUser.getIDToken()
        let authResponse = try await NetworkService.shared.exchangeToken(firebaseToken: idToken)
        accessToken = authResponse.accessToken
        refreshToken = authResponse.refreshToken
        currentUser = authResponse.user
        isAuthenticated = true
        try await refreshMeProfile()
    }
}
