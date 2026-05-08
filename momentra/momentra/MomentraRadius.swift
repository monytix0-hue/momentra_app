//
//  MomentraRadius.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import Foundation

/// Corner radius tokens — pill-heavy system (Momentra Theme Kit v2.2 HTML).
/// `.mc` moment demo uses 16pt; the kit table lists 14pt for generic home cards — use `card` for those, `momentCard` for goal/moment rows.
enum MomentraRadius {
    static let data: CGFloat = 4        // Data rows, list items
    static let input: CGFloat = 12      // Input fields
    static let cardSm: CGFloat = 12     // Small cards, activity
    static let card: CGFloat = 14       // Generic surfaces, bottom chrome
    static let momentCard: CGFloat = 16 // `.mc` moment row
    static let contextTabInner: CGFloat = 10 // Context switcher inner segment (`.ctx-btn`)
    static let button: CGFloat = 14     // CTA buttons
    static let hero: CGFloat = 18       // Hero cards, bottom sheets
    static let pill: CGFloat = 999      // Chips, tabs, badges, avatars
}
