//
//  CircleColors.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Circle context colors — Vibrant. Social. Discovery.
enum CircleColors {
    static let cover = Color(hex: "1A0828")
    static let surface = Color(hex: "4A1060")
    static let accent = Color(hex: "D946EF")
    static let accentEnd = Color(hex: "E879F9")
    static let text = Color(hex: "F5D0FE")
    static let hero = Color(hex: "100520")
    static let tabBg = Color(hex: "1E0E30")
    static let tabDim = Color(hex: "7A3A90")
    
    // Gradients
    static let headerGradient = LinearGradient(
        colors: [Color(hex: "1A0828"), Color(hex: "120F20")],
        startPoint: .top,
        endPoint: .bottom
    )
    
    static let ctaGradient = LinearGradient(
        colors: [Color(hex: "D946EF"), Color(hex: "E879F9")],
        startPoint: .leading,
        endPoint: .trailing
    )
}
