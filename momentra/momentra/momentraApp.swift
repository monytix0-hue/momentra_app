//
//  momentraApp.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI
import FirebaseCore
import GoogleSignIn
#if canImport(UIKit)
import UIKit
#endif

/// Runs before SwiftUI body / delegates so Firebase subsystems (Crashlytics, Sessions) do not log I-COR000003.
enum MomentraFirebase {
    static func configureIfNeeded() {
        if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
            return
        }
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            #if DEBUG
            print("momentra: GoogleService-Info.plist not in bundle — skipping FirebaseApp.configure()")
            #endif
            return
        }
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }
}

@main
struct momentraApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    init() {
        MomentraFirebase.configureIfNeeded()
    }
    
    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}

// MARK: - App Delegate for Firebase

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {
        MomentraFirebase.configureIfNeeded()
        return true
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return GIDSignIn.sharedInstance.handle(url)
    }
}

