//
//  GroupColors.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Group context colors — Energetic. Collaborative. Social.
/// v2.1 warmth tweak: accent #0EC97F (was #10B981)
enum GroupColors {
    static let cover = Color(hex: "0A2A1A")
    static let surface = Color(hex: "064E35")
    static let accent = Color(hex: "0EC97F")      // TWEAK: warmer teal
    static let accentEnd = Color(hex: "34D399")
    static let text = Color(hex: "A7F3D0")
    static let hero = Color(hex: "091A12")
    static let tabBg = Color(hex: "0E2018")
    static let tabDim = Color(hex: "3D7A5C")
    
    // Gradients
    static let headerGradient = LinearGradient(
        colors: [Color(hex: "0A2A1A"), Color(hex: "120F20")],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let ctaGradient = LinearGradient(
        colors: [Color(hex: "0EC97F"), Color(hex: "34D399")],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    // Card orb opacity — 0.30 for warmth (other contexts use 0.25)
    static let orbOpacity: Double = 0.30
}
