import Foundation
import SwiftUI

enum PersonalMomentDuration {
    static let recurringMonthly = "recurring_monthly"
    static let fixedEnd = "fixed_end"
}

struct PersonalQuickTemplate: Hashable {
    let title: String
    let subtitle: String
    var momentType: String = "goal"
    let durationType: String
    var targetAmount: Double?
    var savingMode: String?
    var description: String?
    var endDateIso: String?
    var startDateIso: String?
}

struct BusinessQuickTemplate: Hashable {
    let budgetName: String
    let subtitle: String
    var budgetType: String = "operations"
    var totalBudget: Double?
    var budgetPeriod: String = "Monthly"
    var department: String = "Operations"
    var approvalThreshold: Double?
}

enum HomeEmptyTemplate: Hashable {
    case simple(String)
    case withPreset(PersonalQuickTemplate)
    case withBusinessPreset(BusinessQuickTemplate)
}

func homeEmptyTemplates(for context: MomentraContext) -> [HomeEmptyTemplate] {
    switch context {
    case .personal:
        return [
            .withPreset(PersonalQuickTemplate(
                title: "Emergency Fund",
                subtitle: "Buduratiild a cushion over time",
                durationType: PersonalMomentDuration.recurringMonthly,
                targetAmount: 50_000,
                savingMode: "monthly",
                description: "Safety net for unexpected expenses"
            )),
            .withPreset(PersonalQuickTemplate(
                title: "Monthly Bills",
                subtitle: "Recurring household bills",
                durationType: PersonalMomentDuration.recurringMonthly,
                savingMode: "monthly",
                description: "Rent, utilities, subscriptions"
            )),
            .withPreset(PersonalQuickTemplate(
                title: "Travel Savings",
                subtitle: "Save toward a trip",
                durationType: PersonalMomentDuration.fixedEnd,
                savingMode: "monthly",
                description: "Vacation fund with an end date",
                endDateIso: nil
            )),
        ]
    case .group:
        return [.simple("Trip Split"), .simple("House Expenses"), .simple("Event Planning")]
    case .business:
        return [
            .withBusinessPreset(
                BusinessQuickTemplate(
                    budgetName: "Retail Store - Monthly Ops",
                    subtitle: "Track daily expenses, stock, and staff costs",
                    budgetType: "operations",
                    totalBudget: 120_000,
                    budgetPeriod: "Monthly",
                    department: "Store Operations",
                    approvalThreshold: 2000
                )
            ),
            .withBusinessPreset(
                BusinessQuickTemplate(
                    budgetName: "Cold Pressed Oils - Procurement",
                    subtitle: "Seeds, packaging, and transport purchases",
                    budgetType: "procurement",
                    totalBudget: 180_000,
                    budgetPeriod: "Monthly",
                    department: "Procurement",
                    approvalThreshold: 5000
                )
            ),
            .withBusinessPreset(
                BusinessQuickTemplate(
                    budgetName: "Multi Store - Vendor Payments",
                    subtitle: "Vendor dues with admin approval workflow",
                    budgetType: "vendor_payments",
                    totalBudget: 350_000,
                    budgetPeriod: "Monthly",
                    department: "Finance",
                    approvalThreshold: 7000
                )
            ),
        ]
    case .circle:
        return [.simple("Community Goals"), .simple("Neighborhood Events"), .simple("Creator Pods")]
    }
}

func personalRhythmLabel(_ durationType: String, endDate: String?) -> String {
    switch durationType {
    case PersonalMomentDuration.recurringMonthly:
        return "Monthly"
    case PersonalMomentDuration.fixedEnd:
        if let endDate, !endDate.isEmpty { return "Ends \(endDate)" }
        return "Fixed end"
    default:
        return durationType
    }
}

func calendarDateIso() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withFullDate]
    return String(f.string(from: Date()).prefix(10))
}

func calendarDateIsoPlusYears(_ years: Int) -> String {
    let cal = Calendar.current
    guard let d = cal.date(byAdding: .year, value: years, to: Date()) else { return calendarDateIso() }
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withFullDate]
    return String(f.string(from: d).prefix(10))
}
