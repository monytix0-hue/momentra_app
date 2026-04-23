//
//  PersonalColors.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Personal context colors — Calm. Private. Aspirational.
enum PersonalColors {
    static let cover = Color(hex: "1A0E38")
    static let surface = Color(hex: "2D1F5E")
    static let accent = Color(hex: "6C4EF2")
    static let accentEnd = Color(hex: "8B6FF5")
    static let text = Color(hex: "C4B5FD")
    static let hero = Color(hex: "0F0A20")
    static let tabBg = Color(hex: "1A1430")
    static let tabDim = Color(hex: "6B5FA0")
    
    // Gradients
    static let headerGradient = LinearGradient(
        colors: [Color(hex: "1A0E38"), Color(hex: "120F20")],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let ctaGradient = LinearGradient(
        colors: [Color(hex: "6C4EF2"), Color(hex: "8B6FF5")],
        startPoint: .leading,
        endPoint: .trailing
    )
}
