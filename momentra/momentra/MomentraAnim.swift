//
//  MomentraAnim.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import SwiftUI

/// Animation tokens
enum MomentraAnim {
    // MARK: - Durations
    static let instant: Double = 0.1
    static let fast: Double = 0.15
    static let normal: Double = 0.2
    static let medium: Double = 0.35
    static let ring: Double = 0.9
    static let trigger: Double = 2.0
    
    // MARK: - Animations
    static let standard = Animation.easeInOut
    static let spring = Animation.interpolatingSpring(stiffness: 1, damping: 0.8)
    
    // MARK: - Opacities
    static let rowDone: Double = 0.5
    static let disabled: Double = 0.4
}
