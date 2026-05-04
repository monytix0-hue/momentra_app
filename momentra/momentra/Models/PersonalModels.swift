import Foundation

struct PersonalAccountOut: Codable, Identifiable {
    let accountId: String
    let name: String
    let accountType: String
    let iconEmoji: String?
    let colorHex: String?
    let balance: Double

    var id: String { accountId }

    enum CodingKeys: String, CodingKey {
        case accountId = "account_id"
        case name
        case accountType = "account_type"
        case iconEmoji = "icon_emoji"
        case colorHex = "color_hex"
        case balance
    }
}

struct PersonalHomeOut: Codable {
    let netBalance: Double
    let monthSpend: Double
    let monthIncome: Double
    let budgetSpent: Double
    let budgetCap: Double
    let accounts: [PersonalAccountOut]
    let recent: [PersonalTransactionOut]

    enum CodingKeys: String, CodingKey {
        case netBalance = "net_balance"
        case monthSpend = "month_spend"
        case monthIncome = "month_income"
        case budgetSpent = "budget_spent"
        case budgetCap = "budget_cap"
        case accounts
        case recent
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
    let savedAmount: Double?

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
        case savedAmount = "saved_amount"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        momentId = try c.decode(String.self, forKey: .momentId)
        title = try c.decode(String.self, forKey: .title)
        momentType = try c.decodeIfPresent(String.self, forKey: .momentType)
        durationType = try c.decodeIfPresent(String.self, forKey: .durationType)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        targetAmount = Self.decodeLossyDouble(c, key: .targetAmount)
        startDate = try Self.decodeLossyOptionalString(c, key: .startDate)
        endDate = try Self.decodeLossyOptionalString(c, key: .endDate)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        savingMode = try c.decodeIfPresent(String.self, forKey: .savingMode)
        isPrivateMoment = try c.decodeIfPresent(Bool.self, forKey: .isPrivateMoment)
        savedAmount = Self.decodeLossyDouble(c, key: .savedAmount)
    }

    private static func decodeLossyDouble(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> Double? {
        guard c.contains(key), (try? c.decodeNil(forKey: key)) == false else { return nil }
        if let v = try? c.decode(Double.self, forKey: key) { return v }
        if let s = try? c.decode(String.self, forKey: key) { return Double(s) }
        return nil
    }

    /// Accepts a JSON string or omits if the server encodes dates differently.
    private static func decodeLossyOptionalString(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> String? {
        guard c.contains(key), (try? c.decodeNil(forKey: key)) == false else { return nil }
        if let s = try? c.decode(String.self, forKey: key) { return s }
        return nil
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
    let category: String?
    let subcategoryId: String?
    let subcategoryLabel: String?
    let accountName: String?
    let emoji: String?
    let note: String?
    let txnDate: Date?

    var id: String { transactionId }

    /// When `subtitle` already includes the category path, hide the duplicate category line.
    var categoryIfNotRedundant: String? {
        guard let cat = category?.trimmingCharacters(in: .whitespacesAndNewlines), !cat.isEmpty else { return nil }
        if subtitle.localizedCaseInsensitiveContains(cat) { return nil }
        return cat
    }

    enum CodingKeys: String, CodingKey {
        case transactionId = "transaction_id"
        case title
        case subtitle
        case amount
        case isIncome = "is_income"
        case category
        case subcategoryId = "subcategory_id"
        case subcategoryLabel = "subcategory_label"
        case accountName = "account_name"
        case emoji
        case note
        case txnDate = "txn_date"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        transactionId = try c.decode(String.self, forKey: .transactionId)
        title = try c.decode(String.self, forKey: .title)
        subtitle = try c.decodeIfPresent(String.self, forKey: .subtitle) ?? ""
        amount = try c.decode(Double.self, forKey: .amount)
        isIncome = try c.decode(Bool.self, forKey: .isIncome)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        subcategoryId = try c.decodeIfPresent(String.self, forKey: .subcategoryId)
        subcategoryLabel = try c.decodeIfPresent(String.self, forKey: .subcategoryLabel)
        accountName = try c.decodeIfPresent(String.self, forKey: .accountName)
        emoji = try c.decodeIfPresent(String.self, forKey: .emoji)
        note = try c.decodeIfPresent(String.self, forKey: .note)
        // FastAPI sends Python `date` as "YYYY-MM-DD"; NetworkService JSONDecoder expects full ISO-8601 instants.
        txnDate = Self.decodeTxnDate(from: c, key: .txnDate)
    }

    private static func decodeTxnDate(from c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> Date? {
        guard c.contains(key), (try? c.decodeNil(forKey: key)) == false else { return nil }
        if let s = try? c.decode(String.self, forKey: key) {
            // Book date is a civil calendar day in the user's timezone (not UTC midnight of that string).
            if s.count >= 10 {
                let dayPrefix = String(s.prefix(10))
                var cal = Calendar(identifier: .gregorian)
                cal.timeZone = TimeZone.current
                let parts = dayPrefix.split(separator: "-")
                if parts.count == 3,
                   let y = Int(parts[0]), let mo = Int(parts[1]), let d = Int(parts[2]),
                   let localDay = cal.date(from: DateComponents(year: y, month: mo, day: d))
                {
                    return localDay
                }
            }
            var iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let d = iso.date(from: s) { return d }
            iso.formatOptions = [.withInternetDateTime]
            return iso.date(from: s)
        }
        return try? c.decode(Date.self, forKey: key)
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

/// POST `/personal/signals` — also used to persist Circle social intents until a dedicated Circle API exists.
struct PersonalSignalCreateIn: Codable {
    let signalType: String
    let severity: String
    let message: String

    enum CodingKeys: String, CodingKey {
        case signalType = "signal_type"
        case severity
        case message
    }
}

struct PersonalSignalOut: Codable, Identifiable {
    let signalId: String
    let userId: String
    let signalType: String
    let severity: String
    let message: String
    let createdAt: String?

    var id: String { signalId }

    enum CodingKeys: String, CodingKey {
        case signalId = "signal_id"
        case userId = "user_id"
        case signalType = "signal_type"
        case severity
        case message
        case createdAt = "created_at"
    }
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
    /// Local book date `YYYY-MM-DD`; when nil the server defaults to today.
    let txnDate: String?

    enum CodingKeys: String, CodingKey {
        case isIncome = "is_income"
        case amount
        case category
        case subcategoryId = "subcategory_id"
        case subcategoryLabel = "subcategory_label"
        case accountId = "account_id"
        case title
        case note
        case txnDate = "txn_date"
    }
}

/// PATCH `/personal/transactions/{id}` — only non-nil fields are encoded.
struct PersonalTransactionPatchIn: Encodable {
    var isIncome: Bool?
    var amount: Double?
    var category: String?
    var subcategoryId: String?
    var subcategoryLabel: String?
    var accountId: String?
    var title: String?
    var note: String?
    var txnDate: String?

    enum CodingKeys: String, CodingKey {
        case isIncome = "is_income"
        case amount
        case category
        case subcategoryId = "subcategory_id"
        case subcategoryLabel = "subcategory_label"
        case accountId = "account_id"
        case title
        case note
        case txnDate = "txn_date"
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(isIncome, forKey: .isIncome)
        try c.encodeIfPresent(amount, forKey: .amount)
        try c.encodeIfPresent(category, forKey: .category)
        try c.encodeIfPresent(subcategoryId, forKey: .subcategoryId)
        try c.encodeIfPresent(subcategoryLabel, forKey: .subcategoryLabel)
        try c.encodeIfPresent(accountId, forKey: .accountId)
        try c.encodeIfPresent(title, forKey: .title)
        try c.encodeIfPresent(note, forKey: .note)
        try c.encodeIfPresent(txnDate, forKey: .txnDate)
    }
}

struct PersonalMomentPatchIn: Encodable {
    var title: String?
    var targetAmount: Double?
    var durationType: String?
    var startDate: String?
    var endDate: String?
    var description: String?
    var savingMode: String?
    var isPrivateMoment: Bool?

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

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(title, forKey: .title)
        try c.encodeIfPresent(targetAmount, forKey: .targetAmount)
        try c.encodeIfPresent(durationType, forKey: .durationType)
        try c.encodeIfPresent(startDate, forKey: .startDate)
        try c.encodeIfPresent(endDate, forKey: .endDate)
        try c.encodeIfPresent(description, forKey: .description)
        try c.encodeIfPresent(savingMode, forKey: .savingMode)
        try c.encodeIfPresent(isPrivateMoment, forKey: .isPrivateMoment)
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

/// Civil `YYYY-MM-DD` in the user's current timezone (matches personal transaction book dates).
enum PersonalBookDateFormatting {
    static func yyyyMMdd(from date: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
}

// ── Bill & Recharge Reminders ─────────────────────────────────────────────

struct PersonalReminderOut: Codable, Identifiable {
    let reminderId: String
    let title: String
    let category: String
    let amount: Double
    let dueDate: String
    let isPaid: Bool
    let recurring: String?
    let notes: String?

    var id: String { reminderId }

    enum CodingKeys: String, CodingKey {
        case reminderId = "reminder_id"
        case title
        case category
        case amount
        case dueDate = "due_date"
        case isPaid = "is_paid"
        case recurring
        case notes
    }
}

struct PersonalReminderCreateIn: Codable {
    let title: String
    let category: String
    let amount: Double
    let dueDate: String
    let recurring: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case title
        case category
        case amount
        case dueDate = "due_date"
        case recurring
        case notes
    }
}

struct PersonalReminderPatchIn: Encodable {
    var title: String?
    var category: String?
    var amount: Double?
    var dueDate: String?
    var isPaid: Bool?
    var recurring: String?
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case title
        case category
        case amount
        case dueDate = "due_date"
        case isPaid = "is_paid"
        case recurring
        case notes
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(title, forKey: .title)
        try c.encodeIfPresent(category, forKey: .category)
        try c.encodeIfPresent(amount, forKey: .amount)
        try c.encodeIfPresent(dueDate, forKey: .dueDate)
        try c.encodeIfPresent(isPaid, forKey: .isPaid)
        try c.encodeIfPresent(recurring, forKey: .recurring)
        try c.encodeIfPresent(notes, forKey: .notes)
    }
}
