//
//  MomentraBase.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Base colors used across all contexts
enum MomentraBase {
    // MARK: - Screen Surfaces
    static let bg = Color(hex: "120F20")      // Every screen background
    static let s100 = Color(hex: "1A1728")    // Cards, sheets, nav
    static let s200 = Color(hex: "241F38")    // Inputs, inactive chips
    static let s300 = Color(hex: "302A48")    // Borders, separators
    
    // MARK: - Brand Purple
    static let brandDeep = Color(hex: "2D1F5E")
    static let brand = Color(hex: "6C4EF2")
    static let brandLight = Color(hex: "8B6FF5")
    static let brandText = Color(hex: "C4B5FD")
    
    // MARK: - On-dark Text
    static let onDark = Color(hex: "F5F0FF")
    static let onDark80 = onDark.opacity(0.8)
    static let onDark60 = onDark.opacity(0.6)
    static let onDark40 = onDark.opacity(0.4)
    static let onDark20 = onDark.opacity(0.2)
}

// MARK: - Color Hex Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
