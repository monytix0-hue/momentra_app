//
//  MomentraContextTheme.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI
import Combine

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

/// Observable Theme Kit runtime for SwiftUI surfaces.
/// Use as an EnvironmentObject when a view needs to react to context changes.
@MainActor
final class MomentraTheme: ObservableObject {
    @Published private(set) var context: MomentraContext

    init(context: MomentraContext = .personal) {
        self.context = context
    }

    var current: ContextTheme {
        ContextTheme.theme(for: context)
    }

    func select(_ context: MomentraContext) {
        guard self.context != context else { return }
        self.context = context
    }

    func theme(for context: MomentraContext) -> ContextTheme {
        ContextTheme.theme(for: context)
    }

    func actionStyle(
        status: String? = nil,
        role: DesignTokens.ActionRole = .primary
    ) -> DesignTokens.ActionStyle {
        DesignTokens.actionStyle(context: context, status: status, role: role)
    }

    func actionStyle(
        for context: MomentraContext,
        status: String? = nil,
        role: DesignTokens.ActionRole = .primary
    ) -> DesignTokens.ActionStyle {
        DesignTokens.actionStyle(context: context, status: status, role: role)
    }
}

struct MomentraScreenChrome<Content: View>: View {
    let context: MomentraContext
    var headerHeight: CGFloat = 160
    var orbSize: CGFloat = 420
    var orbOffsetY: CGFloat = 0
    var orbExtraOpacity: Double = 0.08
    private let content: (ContextTheme) -> Content

    init(
        context: MomentraContext,
        headerHeight: CGFloat = 160,
        orbSize: CGFloat = 420,
        orbOffsetY: CGFloat = 0,
        orbExtraOpacity: Double = 0.08,
        @ViewBuilder content: @escaping (ContextTheme) -> Content
    ) {
        self.context = context
        self.headerHeight = headerHeight
        self.orbSize = orbSize
        self.orbOffsetY = orbOffsetY
        self.orbExtraOpacity = orbExtraOpacity
        self.content = content
    }

    var body: some View {
        let theme = ContextTheme.theme(for: context)
        ZStack(alignment: .top) {
            MomentraBase.bg.ignoresSafeArea()
            Rectangle()
                .fill(theme.headerGradient)
                .frame(height: headerHeight)
                .frame(maxHeight: .infinity, alignment: .top)
                .allowsHitTesting(false)
            Circle()
                .fill(theme.accent.opacity(min(theme.orbOpacity + orbExtraOpacity, 0.42)))
                .frame(width: orbSize, height: orbSize)
                .offset(y: orbOffsetY)
                .allowsHitTesting(false)
            content(theme)
        }
        .momentraContext(context)
    }
}

struct MomentraContextTabs: View {
    let selectedContext: MomentraContext
    let onSelect: (MomentraContext) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.spacing.inline) {
                ForEach(MomentraContext.allCases, id: \.self) { context in
                    let ctxTheme = ContextTheme.theme(for: context)
                    let selected = selectedContext == context
                    Button {
                        onSelect(context)
                    } label: {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(ctxTheme.accent)
                                .frame(width: 7, height: 7)
                            Text(context.displayName)
                        }
                        .font(DesignTokens.type.contextTab)
                        .foregroundColor(selected ? ctxTheme.text : MomentraBase.onDark.opacity(0.38))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 9)
                        .background(selected ? ctxTheme.surface : ctxTheme.tabBg.opacity(0.9))
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.contextTabInner))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(6)
            .background(DesignTokens.base.s100.opacity(0.97))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.card))
        }
    }
}

struct MomentraCard<Content: View>: View {
    var background: Color = DesignTokens.base.s100
    private let content: () -> Content

    init(
        background: Color = DesignTokens.base.s100,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.background = background
        self.content = content
    }

    var body: some View {
        content()
            .padding(DesignTokens.spacing.cardH)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.card))
    }
}

struct MomentraPrimaryButton: View {
    let label: String
    let actionStyle: DesignTokens.ActionStyle
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(DesignTokens.type.label)
                .foregroundColor(actionStyle.text)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(
                    LinearGradient(
                        colors: [actionStyle.gradientStart, actionStyle.gradientEnd],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.radius.button)
                        .stroke(actionStyle.gradientStart.opacity(0.35), lineWidth: 0.5)
                )
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.button))
        }
        .buttonStyle(MomentraPressButtonStyle())
    }
}

/// Theme Kit v2.2 — tap feedback (`duration.instant`).
enum MomentraButtonVariant {
    case primary
    case secondary
}

struct MomentraActionButton: View {
    let label: String
    var systemImage: String?
    let actionStyle: DesignTokens.ActionStyle
    var variant: MomentraButtonVariant = .primary
    var secondaryText: Color?
    let action: () -> Void

    private var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: DesignTokens.radius.button)
    }

    private var foreground: Color {
        switch variant {
        case .primary:
            return actionStyle.text
        case .secondary:
            return secondaryText ?? actionStyle.solidAlt
        }
    }

    private var strokeColor: Color {
        switch variant {
        case .primary:
            return actionStyle.gradientStart.opacity(0.35)
        case .secondary:
            return foreground.opacity(0.35)
        }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.spacing.inline) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 15, weight: .semibold))
                }
                Text(label)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            .font(DesignTokens.type.label)
            .foregroundColor(foreground)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background {
                switch variant {
                case .primary:
                    LinearGradient(
                        colors: [actionStyle.gradientStart, actionStyle.gradientEnd],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                case .secondary:
                    actionStyle.solid.opacity(0.12)
                }
            }
            .overlay(shape.stroke(strokeColor, lineWidth: 1))
            .clipShape(shape)
        }
        .buttonStyle(MomentraPressButtonStyle())
    }
}

struct MomentraPressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.92 : 1)
            .animation(.easeOut(duration: MomentraAnim.instant), value: configuration.isPressed)
    }
}

struct MomentraStatusBadge: View {
    let label: String
    let background: Color
    let textColor: Color

    var body: some View {
        Text(label)
            .font(DesignTokens.type.micro)
            .foregroundColor(textColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(background)
            .clipShape(Capsule())
    }
}

struct MomentraProgressBar: View {
    let progress: Double
    let color: Color
    var trackColor: Color

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(trackColor)
                Capsule()
                    .fill(color)
                    .frame(width: proxy.size.width * min(max(progress, 0), 1))
            }
        }
        .frame(height: DesignTokens.sizing.barHeight)
    }
}

struct MomentraBudgetBar: View {
    let pctUsed: Double
    let context: MomentraContext

    var body: some View {
        let theme = ContextTheme.theme(for: context)
        MomentraProgressBar(
            progress: pctUsed,
            color: pctUsed >= 0.85 ? DesignTokens.urgency.high : theme.accent,
            trackColor: theme.surface
        )
    }
}

// MARK: - Sheet chrome (Add flows, modals)

extension View {
    /// Default dark form/list background for sheets so system accent rows do not appear.
    func momentraFormSheetChrome() -> some View {
        scrollContentBackground(.hidden)
            .background(DesignTokens.base.bg.ignoresSafeArea())
            .preferredColorScheme(.dark)
    }
}
