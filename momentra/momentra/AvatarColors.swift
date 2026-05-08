//
//  AvatarColors.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Avatar variant colors for user initials
enum AvatarColors {
    // MARK: - Warm Variant
    static let warmBg = Color(hex: "FAEEDA")
    static let warmText = Color(hex: "633806")
    
    // MARK: - Deep Variant
    static let deepBg = Color(hex: "EEEDFE")
    static let deepText = Color(hex: "3C3489")
    
    // MARK: - Go Variant
    static let goBg = Color(hex: "E1F5EE")
    static let goText = Color(hex: "085041")
    
    /// Returns a color pair based on user index or hash
    static func variant(for index: Int) -> (bg: Color, text: Color) {
        switch index % 3 {
        case 0: return (warmBg, warmText)
        case 1: return (deepBg, deepText)
        default: return (goBg, goText)
        }
    }
}
