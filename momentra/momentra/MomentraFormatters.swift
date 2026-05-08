//
//  MomentraFormatters.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import Foundation

/// INR currency formatters — used by `DesignTokens.formatInr` / `formatInrDisplay`.
enum MomentraFormatters {
    static func formatInr(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "₹0"
    }

    static func formatInrDisplay(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        formatter.groupingSeparator = ","

        let absAmount = abs(amount)
        if absAmount >= 10_000_000 {
            let crores = absAmount / 10_000_000
            return String(format: "₹%.1fCr", crores)
        } else if absAmount >= 100_000 {
            let lakhs = absAmount / 100_000
            return String(format: "₹%.1fL", lakhs)
        } else if absAmount >= 1_000 {
            let thousands = absAmount / 1_000
            return String(format: "₹%.1fk", thousands)
        } else {
            return "₹\(formatter.string(from: NSNumber(value: absAmount)) ?? "0")"
        }
    }
}
