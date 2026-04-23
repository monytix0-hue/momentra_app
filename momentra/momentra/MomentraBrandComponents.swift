//
//  MomentraBrandComponents.swift
//  momentra
//
//  Shared wordmark + chrome for OB-MVP screens (Figma design system v1).
//

import SwiftUI

/// Lowercase wordmark: "momentr" + orange "a" + accent dot (OB-MVP-1 … OB-MVP-4).
struct MomentraWordmark: View {
    var size: CGFloat = 26
    var dotSize: CGFloat = 7
    var dotOffsetX: CGFloat = 2
    var dotOffsetY: CGFloat = -10

    private let ember = DesignTokens.splash.ember
    private let soft = DesignTokens.base.onDark
    private let amber = DesignTokens.splash.amber

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            Text("momentr")
                .font(.system(size: size, weight: .medium))
                .foregroundColor(soft)
                .kerning(-0.5)

            ZStack(alignment: .topTrailing) {
                Text("a")
                    .font(.system(size: size, weight: .medium))
                    .foregroundColor(ember)
                    .kerning(-0.5)

                Circle()
                    .fill(amber)
                    .frame(width: dotSize * 0.7, height: dotSize * 0.7)
                    .offset(x: dotOffsetX, y: dotOffsetY)
            }
        }
    }
}

struct MomentraTagline: View {
    var body: some View {
        Text("TOGETHER · FORWARD")
            .font(.system(size: 9, weight: .regular))
            .tracking(3)
            .foregroundColor(DesignTokens.base.onDark.opacity(0.38))
    }
}
