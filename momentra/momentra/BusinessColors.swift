//
//  BusinessColors.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Business context colors — Structured. Professional. Audit-ready.
/// v2.2: Burnished Amber (changed from blue)
enum BusinessColors {
    static let cover = Color(hex: "1A1200")
    static let surface = Color(hex: "2E2000")
    static let accent = Color(hex: "D4880A")
    static let accentEnd = Color(hex: "F5A623")
    static let text = Color(hex: "FDE68A")
    static let hero = Color(hex: "0D0900")
    static let tabBg = Color(hex: "1A1000")
    static let tabDim = Color(hex: "7A5010")
    
    // Gradients
    static let headerGradient = LinearGradient(
        colors: [Color(hex: "1A1200"), Color(hex: "120F20")],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let ctaGradient = LinearGradient(
        colors: [Color(hex: "D4880A"), Color(hex: "F5A623")],
        startPoint: .leading,
        endPoint: .trailing
    )
}
