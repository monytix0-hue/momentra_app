//
//  LaunchScreenView.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//
// Momentra — Splash Screen
// SwiftUI · iOS 16+
//
// FIXES v2:
//   • People dots radius 6pt (was 7.5) — proportional to 8pt stroke
//   • Right peak stroke-width 8pt (was 4.5) — matches left peak weight
//   • Spark dot cy=18 r=10 — fully inside canvas, no clipping
//
// Usage: present full-screen on app launch; MVP dismisses after ~0.8s (Figma OB-MVP-1).

import Combine
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct LaunchScreenView: View {
    var onFinish: (() -> Void)?

    // ── Animation state ──
    @State private var dotsVisible = [false, false, false, false, false]
    @State private var ghostOpacity: Double = 0
    @State private var peakProgress: CGFloat = 0
    @State private var arcOpacity: Double = 0
    @State private var sparkScale: CGFloat = 0
    @State private var sparkOpacity: Double = 0
    @State private var sparkPulse: CGFloat = 1
    @State private var wordOpacity: Double = 0
    @State private var wordOffset: CGFloat = 12
    @State private var fdotOpacity: Double = 0
    @State private var fdotScale: CGFloat = 0
    @State private var tagOpacity: Double = 0
    @State private var orb1Opacity: Double = 0
    @State private var orb2Opacity: Double = 0

    // ── Brand colours ──
    private let indigo = DesignTokens.base.bg
    private let ember = DesignTokens.splash.ember
    private let amber = DesignTokens.splash.amber
    private let soft = DesignTokens.base.onDark

    var body: some View {
        ZStack {
            indigo.ignoresSafeArea()

            // Background orbs
            Circle().fill(ember.opacity(0.18))
                .frame(width: 260, height: 260)
                .offset(x: 110, y: -190)
                .opacity(orb1Opacity)

            Circle().fill(amber.opacity(0.12))
                .frame(width: 200, height: 200)
                .offset(x: -110, y: 210)
                .opacity(orb2Opacity)

            VStack(spacing: 20) {
                Spacer()

                // ── Mark ──
                MarkCanvas(
                    dotsVisible: dotsVisible,
                    ghostOpacity: ghostOpacity,
                    peakProgress: peakProgress,
                    arcOpacity: arcOpacity,
                    sparkScale: sparkScale * sparkPulse,
                    sparkOpacity: sparkOpacity,
                    soft: soft, ember: ember, amber: amber
                )
                .frame(width: 120, height: 120)

                // ── Wordmark ──
                VStack(spacing: 5) {
                    HStack(alignment: .top, spacing: 0) {
                        Text("momentr")
                            .font(.system(size: 32, weight: .medium))
                            .foregroundColor(soft)
                            .kerning(-0.5)

                        ZStack(alignment: .topTrailing) {
                            Text("a")
                                .font(.system(size: 32, weight: .medium))
                                .foregroundColor(ember)
                                .kerning(-0.5)

                            // Float dot above 'a'
                            Circle()
                                .fill(amber)
                                .frame(width: 7, height: 7)
                                .offset(x: 2, y: -10)
                                .opacity(fdotOpacity)
                                .scaleEffect(fdotScale)
                        }
                    }

                    Text("TOGETHER · FORWARD")
                        .font(.system(size: 9, weight: .regular))
                        .tracking(3)
                        .foregroundColor(soft.opacity(0.38 * tagOpacity))
                }
                .opacity(wordOpacity)
                .offset(y: wordOffset)

                Spacer()

                HStack(spacing: 10) {
                    ProgressView()
                        .tint(MomentraBase.brandText)
                    Text("Loading…")
                        .font(.system(size: 10))
                        .foregroundColor(DesignTokens.base.onDark60)
                }
                .padding(.bottom, 36)
                .opacity(wordOpacity)
            }
        }
        .onAppear { runAnimation() }
    }

    // ── Animation sequence (compressed to fit ~0.8s splash; Figma S-1) ──
    func runAnimation() {
        func schedule(delay: Double, duration: Double, spring: Bool, _ block: @escaping () -> Void) {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                if spring {
                    withAnimation(.interpolatingSpring(stiffness: 350, damping: 13)) { block() }
                } else {
                    withAnimation(.easeOut(duration: duration)) { block() }
                }
            }
        }

        schedule(delay: 0.02, duration: 0.2, spring: false) { orb1Opacity = 1 }
        schedule(delay: 0.05, duration: 0.2, spring: false) { orb2Opacity = 1 }

        let dotDelays: [Double] = [0.06, 0.09, 0.12, 0.15, 0.18]
        for (i, d) in dotDelays.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + d) {
                withAnimation(.interpolatingSpring(stiffness: 380, damping: 12)) {
                    dotsVisible[i] = true
                }
            }
        }

        schedule(delay: 0.2, duration: 0.15, spring: false) { ghostOpacity = 1 }
        withAnimation(.easeInOut(duration: 0.22).delay(0.22)) { peakProgress = 1 }
        schedule(delay: 0.38, duration: 0.1, spring: false) { arcOpacity = 1 }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.42) {
            withAnimation(.easeOut(duration: 0.06)) { sparkOpacity = 1 }
            withAnimation(.interpolatingSpring(stiffness: 420, damping: 10)) { sparkScale = 1 }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.easeInOut(duration: 0.45).repeatForever(autoreverses: true)) {
                sparkPulse = 1.15
            }
        }

        schedule(delay: 0.48, duration: 0.2, spring: false) { wordOpacity = 1; wordOffset = 0 }
        schedule(delay: 0.55, duration: 0.12, spring: true) { fdotOpacity = 1; fdotScale = 1 }
        schedule(delay: 0.62, duration: 0.15, spring: false) { tagOpacity = 1 }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            onFinish?()
        }
    }
}

// ── Mark drawn with Canvas ──
struct MarkCanvas: View {
    let dotsVisible: [Bool]
    let ghostOpacity: Double
    let peakProgress: CGFloat
    let arcOpacity: Double
    let sparkScale: CGFloat
    let sparkOpacity: Double
    let soft: Color
    let ember: Color
    let amber: Color

    var body: some View {
        Canvas { ctx, size in
            // All coordinates are in a 120×120 space
            let s = size.width / 120
            func p(_ v: CGFloat) -> CGFloat { v * s }

            // ── Ghost stroke (left peak path, opacity fades in) ──
            let ghostPath = Path {
                $0.move(to: .init(x: p(14), y: p(100)))
                $0.addLine(to: .init(x: p(14), y: p(50)))
                $0.addLine(to: .init(x: p(34), y: p(74)))
                $0.addLine(to: .init(x: p(54), y: p(24)))
                $0.addLine(to: .init(x: p(54), y: p(100)))
            }
            ctx.stroke(ghostPath,
                       with: .color(soft.opacity(ghostOpacity * 0.15)),
                       style: .init(lineWidth: p(8), lineCap: .round, lineJoin: .round))

            // ── People dots (r=6, proportional to 8pt stroke) ──
            let dotPts: [(CGFloat, CGFloat)] = [
                (14, 100), (14, 62), (34, 74), (54, 32), (54, 100)
            ]
            for (i, pt) in dotPts.enumerated() {
                let (cx, cy) = pt
                guard dotsVisible[i] else { continue }
                let r = p(6)
                ctx.fill(Path(ellipseIn: .init(x: p(cx)-r, y: p(cy)-r, width: r*2, height: r*2)),
                         with: .color(soft))
            }

            // ── Right peak — ember gradient, 8pt stroke ──
            if peakProgress > 0 {
                let pts: [(CGFloat, CGFloat)] = [
                    (54, 100), (54, 32), (74, 74), (94, 32), (96, 100)
                ]
                // Draw segment by segment with ember→amber gradient
                let total = pts.count - 1
                let drawn = Int(peakProgress * CGFloat(total))
                for i in 0..<min(drawn+1, total) {
                    let t = CGFloat(i) / CGFloat(total)
                    let col = lerpColor(ember, amber, t: t)
                    var seg = Path()
                    seg.move(to: .init(x: p(pts[i].0), y: p(pts[i].1)))
                    seg.addLine(to: .init(x: p(pts[i+1].0), y: p(pts[i+1].1)))
                    ctx.stroke(seg, with: .color(col),
                               style: .init(lineWidth: p(8), lineCap: .round, lineJoin: .round))
                }
            }

            // ── Arc trail ──
            if arcOpacity > 0 {
                var arc = Path()
                arc.move(to: .init(x: p(94), y: p(32)))
                arc.addQuadCurve(
                    to: .init(x: p(104), y: p(16)),
                    control: .init(x: p(98), y: p(20)))
                ctx.stroke(arc,
                           with: .color(amber.opacity(arcOpacity * 0.7)),
                           style: .init(lineWidth: p(2.5), lineCap: .round))
            }

            // ── Spark dot (cy=18, r=10 — fully inside 120×120) ──
            if sparkOpacity > 0 {
                let sc = sparkScale
                let sx = p(105), sy = p(18)
                let ro = p(10) * sc
                ctx.fill(Path(ellipseIn: .init(x: sx-ro, y: sy-ro, width: ro*2, height: ro*2)),
                         with: .color(amber.opacity(sparkOpacity)))
                let ri = p(5.5) * sc
                ctx.fill(Path(ellipseIn: .init(x: sx-ri, y: sy-ri, width: ri*2, height: ri*2)),
                         with: .color(ember.opacity(sparkOpacity)))
            }
        }
    }
}

private func lerpColor(_ a: Color, _ b: Color, t: CGFloat) -> Color {
    let ca: [CGFloat]
    let cb: [CGFloat]
    #if canImport(UIKit)
    ca = UIColor(a).cgColor.components ?? [0, 0, 0, 1]
    cb = UIColor(b).cgColor.components ?? [0, 0, 0, 1]
    #elseif canImport(AppKit)
    ca = NSColor(a).cgColor.components ?? [0, 0, 0, 1]
    cb = NSColor(b).cgColor.components ?? [0, 0, 0, 1]
    #else
    ca = [0, 0, 0, 1]
    cb = [0, 0, 0, 1]
    #endif
    return Color(red: Double(ca[0] + (cb[0] - ca[0]) * t),
                 green: Double(ca[1] + (cb[1] - ca[1]) * t),
                 blue: Double(ca[2] + (cb[2] - ca[2]) * t))
}

#Preview {
    LaunchScreenView()
}
