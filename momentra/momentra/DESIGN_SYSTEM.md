# Momentra Design System

**Theme Kit v2.2** — Complete implementation for iOS & macOS

## Overview

This design system implements the full Momentra Theme Kit v2.2 specification with:

- **4 Context Themes**: Personal, Group, Business, Circle
- **Urgency System**: Always overrides context colors for critical states
- **Complete Token System**: Colors, Typography, Spacing, Radius, Sizing, Animation
- **Animated Splash Screen**: Brand-accurate launch experience
- **Platform Support**: iOS 16+, macOS 13+

## Architecture

### Core Files

```
DesignTokens.swift           # Main entry point - unified namespace
MomentraContext.swift        # Context enum + environment system
MomentraContextTheme.swift   # Theme helper for context-specific colors

# Base Tokens
MomentraBase.swift          # Base surfaces & brand colors
MomentraUrgency.swift       # Urgency system (HIGH/MEDIUM/CLEAR)
MomentraType.swift          # Typography tokens
MomentraSpacing.swift       # Spacing tokens
MomentraRadius.swift        # Corner radius tokens
MomentraSizing.swift        # Sizing tokens
MomentraAnim.swift          # Animation tokens

# Context Colors
PersonalColors.swift        # Personal context (indigo)
GroupColors.swift           # Group context (teal) - v2.1 warmth tweak
BusinessColors.swift        # Business context (amber) - v2.2 change
CircleColors.swift          # Circle context (magenta)
AvatarColors.swift          # Avatar variant colors

# Utilities
MomentraFormatters.swift    # INR currency formatters
MomentraScreenBackground.swift  # Background modifier

# UI
LaunchScreenView.swift      # Animated splash screen
```

## Usage

### 1. Basic Setup

Apply the Momentra background and set a context:

```swift
struct MyView: View {
    var body: some View {
        VStack {
            Text("Hello Momentra")
                .foregroundColor(DesignTokens.base.onDark)
        }
        .momentraBackground()  // Applies base.bg #120F20
        .momentraContext(.personal)  // Sets context theme
    }
}
```

### 2. Using Context Themes

Access theme colors dynamically based on context:

```swift
struct MomentCard: View {
    @Environment(\.momentraContext) var context
    
    var theme: ContextTheme {
        DesignTokens.theme(for: context)
    }
    
    var body: some View {
        VStack {
            Text("Emergency Fund")
                .font(DesignTokens.type.titleSM)
                .foregroundColor(DesignTokens.base.onDark)
            
            // Context-aware badge
            Text("PERSONAL")
                .font(DesignTokens.type.micro)
                .foregroundColor(theme.text)
                .padding(8)
                .background(theme.surface)
                .cornerRadius(DesignTokens.radius.pill)
        }
    }
}
```

### 3. Typography

```swift
Text("₹38,000")
    .font(DesignTokens.type.display)  // 28pt bold

Text("Moments Home")
    .font(DesignTokens.type.titleXL)  // 22pt bold

Text("Rahul just paid ₹450")
    .font(DesignTokens.type.body)     // 14pt regular

Text("2 min ago")
    .font(DesignTokens.type.caption)  // 12pt regular

Text("ADD CONTRIBUTION")
    .font(DesignTokens.type.label)    // 11pt semibold
```

### 4. Spacing

```swift
VStack(spacing: DesignTokens.spacing.section) {  // 12pt
    // Content
}
.padding(.horizontal, DesignTokens.spacing.screenH)  // 18pt
.padding(.vertical, DesignTokens.spacing.screenV)    // 16pt
```

### 5. Corner Radius

```swift
RoundedRectangle(cornerRadius: DesignTokens.radius.card)      // 14pt - moment cards
RoundedRectangle(cornerRadius: DesignTokens.radius.button)    // 14pt - CTA buttons
RoundedRectangle(cornerRadius: DesignTokens.radius.pill)      // 999pt - badges, chips
```

### 6. Urgency System

**CRITICAL RULE**: Urgency colors ALWAYS override context colors for ring arcs, CTAs, and story text.

```swift
// HIGH urgency - red
.foregroundColor(DesignTokens.urgency.high)          // #E24B4A
.foregroundColor(DesignTokens.urgency.highText)      // #FCA5A5
.background(DesignTokens.urgency.highSurface)        // #450A0A

// MEDIUM urgency - amber
.foregroundColor(DesignTokens.urgency.medium)        // #F59E0B
.foregroundColor(DesignTokens.urgency.mediumText)    // #FDE68A
.background(DesignTokens.urgency.mediumSurface)      // #451A00

// CTA / CLEAR - teal (for REMIND/OVERDUE always)
.foregroundColor(DesignTokens.urgency.cta)           // #10B981
.background(DesignTokens.urgency.ctaGradient)        // Teal gradient
```

### 7. Status Badges

```swift
// PAID badge
Text("PAID")
    .font(DesignTokens.type.micro)
    .foregroundColor(DesignTokens.urgency.paidText)
    .padding(6)
    .background(DesignTokens.urgency.paidBg)
    .cornerRadius(DesignTokens.radius.pill)

// PENDING badge
Text("PENDING")
    .font(DesignTokens.type.micro)
    .foregroundColor(DesignTokens.urgency.pendingText)
    .padding(6)
    .background(DesignTokens.urgency.pendingBg)
    .cornerRadius(DesignTokens.radius.pill)
```

### 8. Context-Aware Gradients

```swift
let theme = DesignTokens.theme(for: .personal)

// CTA Button
Button("Add Contribution") {
    // action
}
.foregroundColor(.white)
.padding()
.background(theme.ctaGradient)  // Personal: indigo gradient
.cornerRadius(DesignTokens.radius.button)

// Header background
VStack {
    // content
}
.background(theme.headerGradient)  // Personal: dark indigo → base.bg
```

### 9. INR Formatting

```swift
// Precise formatting: ₹38,000
let amount = DesignTokens.formatInr(38000.0)

// Display formatting: ₹38k, ₹1.5L, ₹2.3Cr
let displayAmount = DesignTokens.formatInrDisplay(38000.0)   // "₹38k"
let largeAmount = DesignTokens.formatInrDisplay(150000.0)    // "₹1.5L"
let croAmount = DesignTokens.formatInrDisplay(23000000.0)    // "₹2.3Cr"
```

### 10. Avatars

```swift
// Get avatar colors by variant
let (bg, text) = DesignTokens.avatar.variant(for: userIndex)

Circle()
    .fill(bg)
    .frame(width: DesignTokens.sizing.avatarSM, height: DesignTokens.sizing.avatarSM)
    .overlay(
        Text("RS")
            .font(DesignTokens.type.nano)
            .foregroundColor(text)
    )
```

### 11. Animations

```swift
withAnimation(.easeInOut(duration: DesignTokens.anim.normal)) {
    // 200ms standard transition
}

withAnimation(DesignTokens.anim.spring) {
    // Spring animation for sheets
}

// Ring arc animation
.animation(.easeInOut(duration: DesignTokens.anim.ring), value: progress)
```

## Design Rules (Non-Negotiable)

From Theme Kit v2.2 specification:

### R01 — Urgency Override
❌ **NEVER** use `context.accent` on ring arc, story text, or CTA when urgencyLevel is HIGH or MEDIUM.

✅ **ALWAYS** use `DesignTokens.urgency.high` or `DesignTokens.urgency.medium`

### R05 — REMIND CTA
❌ **NEVER** use context accent for REMIND_OVERDUE CTA.

✅ **ALWAYS** use `DesignTokens.urgency.ctaGradient` (teal)

### R07 — Screen Background
❌ **NEVER** use any background except `DesignTokens.base.bg`

✅ **ALWAYS** use `.momentraBackground()` modifier

### R03 — Funding Bar
✅ Funding bar fill is **ALWAYS** context.accent — never urgency, regardless of health state

### R04 — Budget Bar
⚠️ Budget bar switches to `urgency.high` when `pct_used >= 85`

## Context Themes

### Personal — Calm. Private. Aspirational.
- **Accent**: Indigo `#6C4EF2`
- **Use Cases**: SAVINGS_GOAL, BUDGET_MONTHLY, DEBT_PAYOFF
- **Social Features**: HIDDEN (no participant stack, no Remind CTA)

### Group — Energetic. Collaborative. Social.
- **Accent**: Teal `#0EC97F` (v2.1 warmth tweak)
- **Orb Opacity**: 0.30 (warmer than other contexts)
- **Use Cases**: TRIP, ROOMMATES, FAMILY, EVENT, COUPLE
- **Social Features**: FULL (participant stack, Remind CTA, activity copy)

### Business — Structured. Professional. Audit-ready.
- **Accent**: Burnished Amber `#D4880A` (v2.2 change from blue)
- **Use Cases**: TEAM_EXPENSE, PROJECT_BUDGET, CAMPAIGN
- **Features**: Receipt-first, no confetti, CSV export

### Circle — Vibrant. Social. Discovery.
- **Accent**: Magenta `#D946EF`
- **Use Cases**: MILESTONE, CHALLENGE, SHARED_MOMENT
- **Privacy**: NEVER show exact balances, debt details, settlements

## Splash Screen

The animated splash screen is shown on app launch:

```swift
@main
struct MomentraApp: App {
    @State private var showSplash = true
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                ContentView()
                if showSplash {
                    LaunchScreenView(onFinish: { showSplash = false })
                        .transition(.opacity)
                        .zIndex(1)
                }
            }
            .animation(.easeOut(duration: 0.3), value: showSplash)
        }
    }
}
```

**Animation sequence** (~3.3s total):
1. Background orbs fade in (0.1–0.8s)
2. People dots spring pop (0.28–0.92s)
3. Ghost peak fades (1.08s)
4. Right peak draws with gradient (1.4–1.92s)
5. Arc trail appears (1.92s)
6. Spark pops and pulses (2.13s+)
7. Wordmark fades up (2.33s)
8. Float dot above 'a' (2.57s)
9. Tagline fades in (2.72s)
10. Auto-dismiss (3.3s)

## File Checklist

When adding these files to your Xcode project, ensure all are included in the target:

- [x] DesignTokens.swift
- [x] MomentraContext.swift
- [x] MomentraContextTheme.swift
- [x] MomentraBase.swift
- [x] MomentraUrgency.swift
- [x] PersonalColors.swift
- [x] GroupColors.swift
- [x] BusinessColors.swift
- [x] CircleColors.swift
- [x] AvatarColors.swift
- [x] MomentraType.swift
- [x] MomentraSpacing.swift
- [x] MomentraRadius.swift
- [x] MomentraSizing.swift
- [x] MomentraAnim.swift
- [x] MomentraFormatters.swift
- [x] MomentraScreenBackground.swift
- [x] LaunchScreenView.swift
- [x] DesignTokensDemo.swift (optional showcase)

## Platform Notes

### iOS
- Minimum: iOS 16.0
- Tested: iOS 17+, iOS 18
- SwiftUI, Swift Concurrency

### macOS
- Minimum: macOS 13.0 (Ventura)
- Tested: macOS 14+ (Sonoma)
- AppKit/SwiftUI hybrid compatible

### Color Conversion
The `Color(hex:)` extension handles both UIKit (iOS) and AppKit (macOS) automatically.

## What's New in v2.2

### Business Context — Burnished Amber
All 8 business tokens changed from blue to amber:
- **Why**: Blue `#1E3A5F` was too close to Personal indigo `#2D1F5E`
- **Semantics**: Amber = gold, ledger, audit, receipt (perfect for finance)
- **Tokens**: cover `#1A1200`, surface `#2E2000`, accent `#D4880A`, accent.end `#F5A623`, text `#FDE68A`

### Group Warmth Tweak (v2.1)
- accent: `#10B981` → `#0EC97F` (3° warmer hue)
- orb opacity: 0.25 → 0.30
- Fixes emotional coldness in the most social context

## Support

Refer to `momentra_themekit_v2.2.html` for the complete visual specification.

For questions, check:
- Design rules (R01–R17)
- Surface map (context → token mapping)
- Platform implementation notes
