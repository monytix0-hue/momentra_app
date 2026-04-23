import Foundation

struct PersonalHomeOut: Codable {
    let netBalance: Double

    enum CodingKeys: String, CodingKey {
        case netBalance = "net_balance"
    }
}

struct PersonalMomentItemOut: Codable, Identifiable {
    let momentId: String
    let title: String
    let momentType: String?
    let durationType: String?
    let status: String?
    let targetAmount: Double?
    let startDate: String?
    let endDate: String?
    let description: String?
    let savingMode: String?
    let isPrivateMoment: Bool?

    var id: String { momentId }

    enum CodingKeys: String, CodingKey {
        case momentId = "moment_id"
        case title
        case momentType = "moment_type"
        case durationType = "duration_type"
        case status
        case targetAmount = "target_amount"
        case startDate = "start_date"
        case endDate = "end_date"
        case description
        case savingMode = "saving_mode"
        case isPrivateMoment = "is_private_moment"
    }
}

struct PersonalMomentListResponse: Codable {
    let moments: [PersonalMomentItemOut]
}

struct PersonalTransactionOut: Codable, Identifiable {
    let transactionId: String
    let title: String
    let subtitle: String
    let amount: Double
    let isIncome: Bool

    var id: String { transactionId }

    enum CodingKeys: String, CodingKey {
        case transactionId = "transaction_id"
        case title
        case subtitle
        case amount
        case isIncome = "is_income"
    }
}

struct PersonalTransactionListOut: Codable {
    let transactions: [PersonalTransactionOut]
}

struct PersonalSubcategoryOut: Codable, Identifiable {
    let subcategoryId: String
    let name: String

    var id: String { subcategoryId }

    enum CodingKeys: String, CodingKey {
        case subcategoryId = "subcategory_id"
        case name
    }
}

struct PersonalCategoryOut: Codable, Identifiable {
    let categoryId: String
    let kind: String
    let name: String
    let iconEmoji: String?
    let subcategories: [PersonalSubcategoryOut]

    var id: String { categoryId }

    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case kind
        case name
        case iconEmoji = "icon_emoji"
        case subcategories
    }
}

struct PersonalCategoryListOut: Codable {
    let categories: [PersonalCategoryOut]
}

struct PersonalTransactionCreateIn: Codable {
    let isIncome: Bool
    let amount: Double
    let category: String
    let subcategoryId: String?
    let subcategoryLabel: String?
    let accountId: String?
    let title: String?
    let note: String?

    enum CodingKeys: String, CodingKey {
        case isIncome = "is_income"
        case amount
        case category
        case subcategoryId = "subcategory_id"
        case subcategoryLabel = "subcategory_label"
        case accountId = "account_id"
        case title
        case note
    }
}

struct PersonalMomentPatchIn: Codable {
    let title: String?
    let targetAmount: Double?
    let durationType: String?
    let startDate: String?
    let endDate: String?
    let description: String?
    let savingMode: String?
    let isPrivateMoment: Bool?

    enum CodingKeys: String, CodingKey {
        case title
        case targetAmount = "target_amount"
        case durationType = "duration_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case description
        case savingMode = "saving_mode"
        case isPrivateMoment = "is_private_moment"
    }
}

struct PersonalMomentMilestoneIn: Codable {
    let title: String
    let meta: String?
}

struct PersonalMomentCreateIn: Codable {
    let title: String
    let momentType: String
    let durationType: String
    let targetAmount: Double?
    let startDate: String?
    let endDate: String?
    let savingMode: String?
    let description: String?
    let milestones: [PersonalMomentMilestoneIn]
    let status: String
    let isPrivateMoment: Bool
    let weeklyReminders: Bool
    let milestoneAlerts: Bool
    let lowVelocityWarning: Bool
    let autoArchiveOnComplete: Bool
    let notifyViaPush: Bool
    let notifyViaWhatsapp: Bool
    let notifyViaEmail: Bool

    enum CodingKeys: String, CodingKey {
        case title
        case momentType = "moment_type"
        case durationType = "duration_type"
        case targetAmount = "target_amount"
        case startDate = "start_date"
        case endDate = "end_date"
        case savingMode = "saving_mode"
        case description
        case milestones
        case status
        case isPrivateMoment = "is_private_moment"
        case weeklyReminders = "weekly_reminders"
        case milestoneAlerts = "milestone_alerts"
        case lowVelocityWarning = "low_velocity_warning"
        case autoArchiveOnComplete = "auto_archive_on_complete"
        case notifyViaPush = "notify_via_push"
        case notifyViaWhatsapp = "notify_via_whatsapp"
        case notifyViaEmail = "notify_via_email"
    }
}

struct PersonalMomentCreateOut: Codable {
    let momentId: String
    let title: String
    let momentType: String
    let durationType: String

    enum CodingKeys: String, CodingKey {
        case momentId = "moment_id"
        case title
        case momentType = "moment_type"
        case durationType = "duration_type"
    }
}

