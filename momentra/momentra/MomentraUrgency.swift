//
//  MomentraUrgency.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Urgency system — always overrides context colors
enum MomentraUrgency {
    // MARK: - High Urgency (Red)
    static let high = Color(hex: "E24B4A")
    static let highText = Color(hex: "FCA5A5")
    static let highSurface = Color(hex: "450A0A")
    
    // MARK: - Medium Urgency (Amber)
    static let medium = Color(hex: "F59E0B")
    static let mediumText = Color(hex: "FDE68A")
    static let mediumSurface = Color(hex: "451A00")
    
    // MARK: - CTA / Clear (Teal)
    static let cta = Color(hex: "10B981")
    static let ctaEnd = Color(hex: "34D399")
    static let ctaText = Color(hex: "A7F3D0")
    
    // MARK: - Status Badges
    static let paidBg = Color(hex: "064E35")
    static let paidText = Color(hex: "10B981")
    
    static let pendingBg = Color(hex: "451A00")
    static let pendingText = Color(hex: "F59E0B")
    
    static let overdueBg = Color(hex: "450A0A")
    static let overdueText = Color(hex: "E24B4A")
    
    // MARK: - Urgency CTA Gradient (always teal for REMIND/OVERDUE)
    static let ctaGradient = LinearGradient(
        colors: [cta, ctaEnd],
        startPoint: .leading,
        endPoint: .trailing
    )
}
