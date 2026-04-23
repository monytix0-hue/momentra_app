//
//  MomentraContextTheme.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Helper to get theme colors for a given context
struct ContextTheme {
    let cover: Color
    let surface: Color
    let accent: Color
    let accentEnd: Color
    let text: Color
    let hero: Color
    let tabBg: Color
    let tabDim: Color
    let headerGradient: LinearGradient
    let ctaGradient: LinearGradient
    let orbOpacity: Double
    
    static func theme(for context: MomentraContext) -> ContextTheme {
        switch context {
        case .personal:
            return ContextTheme(
                cover: PersonalColors.cover,
                surface: PersonalColors.surface,
                accent: PersonalColors.accent,
                accentEnd: PersonalColors.accentEnd,
                text: PersonalColors.text,
                hero: PersonalColors.hero,
                tabBg: PersonalColors.tabBg,
                tabDim: PersonalColors.tabDim,
                headerGradient: PersonalColors.headerGradient,
                ctaGradient: PersonalColors.ctaGradient,
                orbOpacity: 0.25
            )
        case .group:
            return ContextTheme(
                cover: GroupColors.cover,
                surface: GroupColors.surface,
                accent: GroupColors.accent,
                accentEnd: GroupColors.accentEnd,
                text: GroupColors.text,
                hero: GroupColors.hero,
                tabBg: GroupColors.tabBg,
                tabDim: GroupColors.tabDim,
                headerGradient: GroupColors.headerGradient,
                ctaGradient: GroupColors.ctaGradient,
                orbOpacity: GroupColors.orbOpacity
            )
        case .business:
            return ContextTheme(
                cover: BusinessColors.cover,
                surface: BusinessColors.surface,
                accent: BusinessColors.accent,
                accentEnd: BusinessColors.accentEnd,
                text: BusinessColors.text,
                hero: BusinessColors.hero,
                tabBg: BusinessColors.tabBg,
                tabDim: BusinessColors.tabDim,
                headerGradient: BusinessColors.headerGradient,
                ctaGradient: BusinessColors.ctaGradient,
                orbOpacity: 0.25
            )
        case .circle:
            return ContextTheme(
                cover: CircleColors.cover,
                surface: CircleColors.surface,
                accent: CircleColors.accent,
                accentEnd: CircleColors.accentEnd,
                text: CircleColors.text,
                hero: CircleColors.hero,
                tabBg: CircleColors.tabBg,
                tabDim: CircleColors.tabDim,
                headerGradient: CircleColors.headerGradient,
                ctaGradient: CircleColors.ctaGradient,
                orbOpacity: 0.25
            )
        }
    }
}

/// Convenience function for getting context theme
func contextTheme(_ context: MomentraContext) -> ContextTheme {
    ContextTheme.theme(for: context)
}
