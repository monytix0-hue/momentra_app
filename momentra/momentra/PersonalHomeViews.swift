//
//  PersonalHomeViews.swift
//  momentra
//
//  Theme Kit v2.2 — Personal moment list rows (parity with Android).
//

import SwiftUI

// MARK: - Goal row (moment card)

struct PersonalMomentGoalCardView: View {
    let title: String
    let momentType: String?
    let targetAmount: Double?
    let durationType: String?
    let endDate: String?
    let status: String?
    let savedAmount: Double?
    let theme: ContextTheme
    let onTap: () -> Void

    private var badge: String { personalMomentTypeBadgeLabel(momentType) }
    private var subline: String { personalGoalCardSubline(target: targetAmount, status: status, saved: savedAmount) }
    private var savedFraction: Double? {
        guard let s = savedAmount, let t = targetAmount, t > 0 else { return nil }
        return min(max(s / t, 0), 1)
    }

    private var metaLine: String? {
        var parts: [String] = []
        if let d = personalGoalDaysLeftLabel(endDate: endDate) { parts.append(d) }
        if let f = savedFraction { parts.append("\(Int(f * 100))% saved") }
        if parts.isEmpty, let dt = durationType {
            parts.append(personalRhythmLabel(dt, endDate: endDate))
        }
        let s = parts.joined(separator: " · ")
        return s.isEmpty ? nil : s
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Circle()
                .fill(theme.accent.opacity(0.25))
                .frame(width: 88, height: 88)
                .offset(x: 10, y: -6)

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: 8) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(DesignTokens.base.onDark)
                        .lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(badge)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(theme.text)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(theme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(theme.text.opacity(0.25), lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                if !subline.isEmpty {
                    Text(subline)
                        .font(.system(size: 13))
                        .foregroundColor(DesignTokens.base.onDark60)
                        .padding(.top, 6)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(DesignTokens.base.s200.opacity(0.45))
                            .frame(height: 4)
                        let frac = CGFloat(savedFraction ?? 0)
                        if frac > 0 {
                            Capsule()
                                .fill(
                                    LinearGradient(
                                        colors: [theme.accent, theme.accentEnd],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: max(4, geo.size.width * frac), height: 4)
                        }
                    }
                }
                .frame(height: 4)
                .padding(.top, 10)

                if let metaLine {
                    Text(metaLine)
                        .font(.system(size: 12))
                        .foregroundColor(DesignTokens.base.onDark40)
                        .padding(.top, 8)
                }
            }
            .padding(14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.momentCard))
        .contentShape(RoundedRectangle(cornerRadius: DesignTokens.radius.momentCard))
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Helpers

private func personalMomentTypeBadgeLabel(_ momentType: String?) -> String {
    let raw = momentType?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() ?? ""
    if raw.isEmpty { return "GOAL" }
    if let idx = raw.firstIndex(of: "_") {
        return String(raw[..<idx])
    }
    return raw
}

private func personalGoalCardSubline(target: Double?, status: String?, saved: Double?) -> String {
    if let s = saved, let t = target, t > 0 {
        return "\(DesignTokens.formatInr(s)) of \(DesignTokens.formatInr(t))"
    }
    if let t = target, t > 0 {
        return "Target · \(DesignTokens.formatInr(t))"
    }
    return status?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
}

private func personalGoalDaysLeftLabel(endDate: String?) -> String? {
    let raw = endDate?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if raw.count < 10 { return nil }
    let prefix = String(raw.prefix(10))
    let fmt = DateFormatter()
    fmt.calendar = Calendar(identifier: .gregorian)
    fmt.locale = Locale(identifier: "en_US_POSIX")
    fmt.timeZone = TimeZone(secondsFromGMT: 0)
    fmt.dateFormat = "yyyy-MM-dd"
    guard let end = fmt.date(from: prefix) else { return nil }
    let startOfEnd = Calendar.current.startOfDay(for: end)
    let startOfToday = Calendar.current.startOfDay(for: Date())
    let days = Calendar.current.dateComponents([.day], from: startOfToday, to: startOfEnd).day ?? 0
    if days < 0 { return "\(-days) days overdue" }
    if days == 0 { return "Ends today" }
    if days == 1 { return "1 day left" }
    return "\(days) days left"
}
