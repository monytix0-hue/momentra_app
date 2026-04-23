//
//  MomentraScreenBackground.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Screen background modifier — applies Momentra base background
struct MomentraScreenBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(MomentraBase.bg.ignoresSafeArea())
    }
}

extension View {
    /// Apply Momentra screen background (base.bg #120F20)
    func momentraBackground() -> some View {
        modifier(MomentraScreenBackground())
    }
}
