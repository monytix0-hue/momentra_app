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

struct GroupQuickTemplate: Hashable {
    let title: String
    let subtitle: String
    var momentType: String = "trip_fund"
    var splitMode: String = GroupSplitMode.equal
    var targetAmount: Double?
    var destination: String?
    var tripStartDateIso: String?
    var tripEndDateIso: String?
}

enum HomeEmptyTemplate: Hashable {
    case simple(String)
    case withPreset(PersonalQuickTemplate)
    case withGroupPreset(GroupQuickTemplate)
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
            .withPreset(PersonalQuickTemplate(
                title: "Health Fund",
                subtitle: "Medical and wellness safety",
                durationType: PersonalMomentDuration.recurringMonthly,
                targetAmount: 75_000,
                savingMode: "monthly",
                description: "Emergency and preventive health expenses"
            )),
            .withPreset(PersonalQuickTemplate(
                title: "Education Goal",
                subtitle: "Courses and certifications",
                durationType: PersonalMomentDuration.fixedEnd,
                targetAmount: 120_000,
                savingMode: "monthly",
                description: "Upskilling plan with a fixed deadline"
            )),
            .withPreset(PersonalQuickTemplate(
                title: "Device Upgrade",
                subtitle: "Phone or laptop replacement",
                durationType: PersonalMomentDuration.fixedEnd,
                targetAmount: 90_000,
                savingMode: "monthly",
                description: "Upgrade essential devices without debt"
            )),
        ]
    case .group:
        return [
            .withGroupPreset(
                GroupQuickTemplate(
                    title: "Trip Split",
                    subtitle: "Shared travel fund — split evenly",
                    momentType: "trip_fund",
                    splitMode: GroupSplitMode.equal,
                    targetAmount: nil,
                    destination: "Trip",
                    tripStartDateIso: nil,
                    tripEndDateIso: nil
                )
            ),
            .withGroupPreset(
                GroupQuickTemplate(
                    title: "House Expenses",
                    subtitle: "Rent and utilities — by percent",
                    momentType: "trip_fund",
                    splitMode: GroupSplitMode.percent,
                    targetAmount: nil,
                    destination: nil,
                    tripStartDateIso: nil,
                    tripEndDateIso: nil
                )
            ),
            .withGroupPreset(
                GroupQuickTemplate(
                    title: "Event Planning",
                    subtitle: "Parties and tickets — by shares",
                    momentType: "trip_fund",
                    splitMode: GroupSplitMode.shares,
                    targetAmount: nil,
                    destination: nil,
                    tripStartDateIso: nil,
                    tripEndDateIso: nil
                )
            ),
            .withGroupPreset(
                GroupQuickTemplate(
                    title: "Wedding Pool",
                    subtitle: "Shared wedding spends — split by shares",
                    momentType: "trip_fund",
                    splitMode: GroupSplitMode.shares,
                    targetAmount: nil,
                    destination: "Wedding",
                    tripStartDateIso: nil,
                    tripEndDateIso: nil
                )
            ),
            .withGroupPreset(
                GroupQuickTemplate(
                    title: "Roommate Groceries",
                    subtitle: "Monthly groceries — equal split",
                    momentType: "trip_fund",
                    splitMode: GroupSplitMode.equal,
                    targetAmount: nil,
                    destination: nil,
                    tripStartDateIso: nil,
                    tripEndDateIso: nil
                )
            ),
            .withGroupPreset(
                GroupQuickTemplate(
                    title: "Weekend Outing",
                    subtitle: "Short trip and activities — exact split",
                    momentType: "trip_fund",
                    splitMode: GroupSplitMode.exact,
                    targetAmount: nil,
                    destination: "Weekend Outing",
                    tripStartDateIso: nil,
                    tripEndDateIso: nil
                )
            ),
        ]
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
            .withBusinessPreset(
                BusinessQuickTemplate(
                    budgetName: "Marketing Sprint Budget",
                    subtitle: "Campaign ad spends and creatives",
                    budgetType: "marketing",
                    totalBudget: 95_000,
                    budgetPeriod: "Monthly",
                    department: "Marketing",
                    approvalThreshold: 3000
                )
            ),
            .withBusinessPreset(
                BusinessQuickTemplate(
                    budgetName: "Payroll Reserve",
                    subtitle: "Salary and contractor payouts",
                    budgetType: "payroll",
                    totalBudget: 420_000,
                    budgetPeriod: "Monthly",
                    department: "People Ops",
                    approvalThreshold: 10_000
                )
            ),
            .withBusinessPreset(
                BusinessQuickTemplate(
                    budgetName: "Equipment Maintenance",
                    subtitle: "Service and repair of machinery",
                    budgetType: "maintenance",
                    totalBudget: 160_000,
                    budgetPeriod: "Quarterly",
                    department: "Operations",
                    approvalThreshold: 6000
                )
            ),
        ]
    case .circle:
        return [.simple("Community Goals"), .simple("Neighborhood Events"), .simple("Creator Pods")]
    }
}

/// Group moment presets for create flow (same catalog as `homeEmptyTemplates(for: .group)`).
func groupQuickTemplates() -> [GroupQuickTemplate] {
    homeEmptyTemplates(for: .group).compactMap { item in
        if case .withGroupPreset(let preset) = item { return preset }
        return nil
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
