//
//  DesignTokens.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Unified namespace for all design tokens in Momentra.
/// This wraps and re-exports color, spacing, typography, radius, sizing, and animation tokens.
/// Prefer using `DesignTokens` as your entry point in views.
enum DesignTokens {

    // MARK: - Contexts & Theme
    static let context = MomentraContext.self
    
    /// Get theme for a specific context
    static func theme(for context: MomentraContext) -> ContextTheme {
        ContextTheme.theme(for: context)
    }

    enum UrgencyLevel {
        case clear
        case medium
        case high
    }

    enum ActionRole {
        case primary
        case remindOverdue
    }

    struct ActionStyle {
        let solid: Color
        let solidAlt: Color
        let gradientStart: Color
        let gradientEnd: Color
        let text: Color
    }

    static func urgencyLevel(for status: String?) -> UrgencyLevel {
        let normalized = status?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        if normalized.contains("overdue") || normalized.contains("high") || normalized.contains("late") {
            return .high
        }
        if normalized.contains("medium") || normalized.contains("warning") || normalized.contains("due_soon") {
            return .medium
        }
        return .clear
    }

    static func actionStyle(
        context: MomentraContext,
        status: String?,
        role: ActionRole = .primary
    ) -> ActionStyle {
        let level = urgencyLevel(for: status)
        let useUrgencyCta = role == .remindOverdue || level != .clear
        if useUrgencyCta {
            return ActionStyle(
                solid: urgency.cta,
                solidAlt: urgency.ctaEnd,
                gradientStart: urgency.cta,
                gradientEnd: urgency.ctaEnd,
                text: semantic.ctaText
            )
        }

        let themeTokens = theme(for: context)
        return ActionStyle(
            solid: themeTokens.accent,
            solidAlt: themeTokens.accentEnd,
            gradientStart: themeTokens.accent,
            gradientEnd: themeTokens.accentEnd,
            text: semantic.ctaText
        )
    }

    // MARK: - Base Colors
    static let base = MomentraBase.self

    // MARK: - Urgency Colors
    static let urgency = MomentraUrgency.self

    // MARK: - Personal Context Colors
    static let personal = PersonalColors.self

    // MARK: - Group Context Colors
    static let group = GroupColors.self

    // MARK: - Business Context Colors
    static let business = BusinessColors.self

    // MARK: - Circle Context Colors
    static let circle = CircleColors.self
    
    // MARK: - Splash colors
    static let splash = SplashColors.self

    // MARK: - Typography
    static let type = MomentraType.self

    // MARK: - Spacing
    static let spacing = MomentraSpacing.self

    // MARK: - Radius
    static let radius = MomentraRadius.self

    // MARK: - Sizing
    static let sizing = MomentraSizing.self

    // MARK: - Animation
    static let anim = MomentraAnim.self

    // MARK: - Avatar Colors
    static let avatar = AvatarColors.self
    
    // MARK: - Semantic roles
    static let semantic = MomentraSemantic.self

    // MARK: - INR Formatter
    static func formatInr(_ amount: Double) -> String {
        MomentraFormatters.formatInr(amount)
    }
    
    static func formatInrDisplay(_ amount: Double) -> String {
        MomentraFormatters.formatInrDisplay(amount)
    }
}

// Usage Examples:
//
// let theme = DesignTokens.theme(for: .personal)
// Text("Amount").foregroundColor(DesignTokens.personal.text)
// .font(DesignTokens.type.display)
//
// .padding(.horizontal, DesignTokens.spacing.screenH)
// .cornerRadius(DesignTokens.radius.cardSm)
