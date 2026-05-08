import Foundation

enum PersonalTab: String, CaseIterable, Hashable, Identifiable {
    case today
    case plan
    case activity
    case insights
    case me

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: return "Today"
        case .plan: return "Plan"
        case .activity: return "Activity"
        case .insights: return "Insights"
        case .me: return "Me"
        }
    }

    var systemImage: String {
        switch self {
        case .today: return "sun.max.fill"
        case .plan: return "calendar"
        case .activity: return "chart.bar.fill"
        case .insights: return "brain.head.profile"
        case .me: return "person.crop.circle"
        }
    }
}
