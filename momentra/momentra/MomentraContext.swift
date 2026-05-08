//
//  MomentraContext.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Context types for Momentra — determines theme colors
enum MomentraContext: String, CaseIterable {
    case personal
    case group
    case business
    case circle
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Environment Key for Current Context
struct MomentraContextKey: EnvironmentKey {
    static var defaultValue: MomentraContext = .personal
}

extension EnvironmentValues {
    var momentraContext: MomentraContext {
        get { self[MomentraContextKey.self] }
        set { self[MomentraContextKey.self] = newValue }
    }
}

// MARK: - View Extension for Context
extension View {
    func momentraContext(_ context: MomentraContext) -> some View {
        environment(\.momentraContext, context)
    }
}
