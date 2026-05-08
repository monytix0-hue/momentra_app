//
//  MomentraPhoneAuthUIDelegate.swift
//  momentra
//
//  Presents Firebase Phone Auth reCAPTCHA / web flows from SwiftUI.
//

#if canImport(UIKit)
import UIKit
import FirebaseAuth

final class MomentraPhoneAuthUIDelegate: NSObject, AuthUIDelegate {
    func present(_ viewControllerToPresent: UIViewController, animated flag: Bool, completion: (() -> Void)?) {
        guard let root = keyWindow?.rootViewController else {
            completion?()
            return
        }
        var top = root
        while let p = top.presentedViewController { top = p }
        top.present(viewControllerToPresent, animated: flag, completion: completion)
    }

    func dismiss(animated flag: Bool, completion: (() -> Void)?) {
        guard let root = keyWindow?.rootViewController else {
            completion?()
            return
        }
        var top = root
        while let p = top.presentedViewController { top = p }
        top.dismiss(animated: flag, completion: completion)
    }

    private var keyWindow: UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }
    }
}
#endif
