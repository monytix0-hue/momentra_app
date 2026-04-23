//
//  MomentraType.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Typography tokens — Plus Jakarta Sans
enum MomentraType {
    private static let regularName = "PlusJakartaSans-Regular"
    private static let mediumName = "PlusJakartaSans-Medium"
    private static let semiboldName = "PlusJakartaSans-SemiBold"
    private static let boldName = "PlusJakartaSans-Bold"
    private static let variableNames = [
        "PlusJakartaSans-wght",
        "PlusJakartaSans[wght]",
        "PlusJakartaSans",
        "Plus Jakarta Sans"
    ]

    private static func resolveFontName(for preferred: String, size: CGFloat) -> String? {
#if canImport(UIKit)
        if UIFont(name: preferred, size: size) != nil {
            return preferred
        }
        for candidate in variableNames where UIFont(name: candidate, size: size) != nil {
            return candidate
        }
#endif
        return nil
    }

    private static func plusJakarta(size: CGFloat, weight: Font.Weight) -> Font {
        let fontName: String = switch weight {
        case .bold:
            boldName
        case .semibold:
            semiboldName
        case .medium:
            mediumName
        default:
            regularName
        }

#if canImport(UIKit)
        if let resolved = resolveFontName(for: fontName, size: size) {
            return Font.custom(resolved, size: size)
        }
#endif
        return .system(size: size, weight: weight)
    }

    // MARK: - Display
    static let display = plusJakarta(size: 28, weight: .bold).leading(.tight)
    
    // MARK: - Titles
    static let titleXL = plusJakarta(size: 22, weight: .bold)
    static let titleLG = plusJakarta(size: 20, weight: .semibold)
    static let titleMD = plusJakarta(size: 17, weight: .semibold)
    static let titleSM = plusJakarta(size: 15, weight: .semibold)
    
    // MARK: - Body
    static let body = plusJakarta(size: 14, weight: .regular)
    static let bodyMedium = plusJakarta(size: 14, weight: .medium)
    
    // MARK: - Caption & Labels
    static let caption = plusJakarta(size: 12, weight: .regular)
    static let label = plusJakarta(size: 11, weight: .semibold)
    static let micro = plusJakarta(size: 10, weight: .semibold)
    static let nano = plusJakarta(size: 9, weight: .medium)
}

// MARK: - Custom Font Support (if bundling Plus Jakarta Sans)
extension MomentraType {
    /// Uses Plus Jakarta Sans when available, otherwise falls back to system weight.
    static func customFont(name: String = regularName, size: CGFloat) -> Font {
#if canImport(UIKit)
        if let resolved = resolveFontName(for: name, size: size) {
            return Font.custom(resolved, size: size)
        }
#endif
        return .system(size: size, weight: .regular)
    }
}
