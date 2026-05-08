import Foundation

enum GroupSplitMode {
    static let equal = "equal"
    static let exact = "exact"
    static let percent = "percent"
    static let shares = "shares"
}

struct GroupMemberSeedIn: Codable {
    let displayName: String
    let email: String?
    let role: String

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case email
        case role
    }
}

struct GroupMomentCreateIn: Codable {
    let title: String
    let momentType: String
    let targetAmount: Double?
    let destination: String?
    let tripStartDate: String?
    let tripEndDate: String?
    let splitMode: String
    let contributionDueDate: String?
    let members: [GroupMemberSeedIn]
    let rules: GroupMomentRulesIn

    enum CodingKeys: String, CodingKey {
        case title
        case momentType = "moment_type"
        case targetAmount = "target_amount"
        case destination
        case tripStartDate = "trip_start_date"
        case tripEndDate = "trip_end_date"
        case splitMode = "split_mode"
        case contributionDueDate = "contribution_due_date"
        case members
        case rules
    }
}

struct GroupMomentOut: Codable, Identifiable {
    let momentId: String
    /// Organiser Firebase uid; PATCH/DELETE require this to match the signed-in user (server enforces).
    let ownerUid: String?
    let title: String
    let momentType: String?
    let targetAmount: Double?
    let destination: String?
    let contributionDueDate: String?
    let status: String?
    let raisedAmount: Double?
    let splitMode: String?
    let tripStartDate: String?
    let tripEndDate: String?

    var id: String { momentId }

    enum CodingKeys: String, CodingKey {
        case momentId = "moment_id"
        case ownerUid = "owner_uid"
        case title
        case momentType = "moment_type"
        case targetAmount = "target_amount"
        case destination
        case contributionDueDate = "contribution_due_date"
        case status
        case raisedAmount = "raised_amount"
        case splitMode = "split_mode"
        case tripStartDate = "trip_start_date"
        case tripEndDate = "trip_end_date"
    }
}

struct GroupMomentListOut: Codable {
    let moments: [GroupMomentOut]
}

struct GroupMomentRulesOut: Codable {
    let sendPaymentReminders: Bool
    let autoNotifyOnContribution: Bool
    let allowPartialPayments: Bool
    let requireReceiptForExpenses: Bool
    let requireOrganiserApproval: Bool

    enum CodingKeys: String, CodingKey {
        case sendPaymentReminders = "send_payment_reminders"
        case autoNotifyOnContribution = "auto_notify_on_contribution"
        case allowPartialPayments = "allow_partial_payments"
        case requireReceiptForExpenses = "require_receipt_for_expenses"
        case requireOrganiserApproval = "require_organiser_approval"
    }
}

struct GroupMemberLedgerOut: Codable, Identifiable {
    let memberId: String
    let firebaseUid: String?
    let displayName: String?
    let email: String?
    let role: String
    let status: String
    let joinedAt: String?
    let expectedShare: Double
    let contributedTotal: Double
    let paid: Bool

    var id: String { memberId }

    enum CodingKeys: String, CodingKey {
        case memberId = "member_id"
        case firebaseUid = "firebase_uid"
        case displayName = "display_name"
        case email
        case role
        case status
        case joinedAt = "joined_at"
        case expectedShare = "expected_share"
        case contributedTotal = "contributed_total"
        case paid
    }
}

struct GroupBudgetCategoryOut: Codable, Identifiable {
    let categoryId: String
    let categoryKey: String
    let displayName: String
    let capAmount: Double
    let spentAmount: Double

    var id: String { categoryId }

    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryKey = "category_key"
        case displayName = "display_name"
        case capAmount = "cap_amount"
        case spentAmount = "spent_amount"
    }
}

struct GroupExpenseSplitLineIn: Codable {
    let memberId: String
    let value: Double

    enum CodingKeys: String, CodingKey {
        case memberId = "member_id"
        case value
    }
}

struct GroupExpenseCreateIn: Codable {
    let categoryKey: String
    let subcategory: String?
    let title: String
    let amount: Double
    let expenseDate: String
    let paidByMemberId: String
    let receiptNotes: String?
    let splitMode: String
    let splitLines: [GroupExpenseSplitLineIn]

    enum CodingKeys: String, CodingKey {
        case categoryKey = "category_key"
        case subcategory
        case title
        case amount
        case expenseDate = "expense_date"
        case paidByMemberId = "paid_by_member_id"
        case receiptNotes = "receipt_notes"
        case splitMode = "split_mode"
        case splitLines = "split_lines"
    }
}

struct GroupTotalsOut: Codable {
    let raisedAmount: Double
    let spentExpensesAmount: Double
    let lastActivityAt: String?

    enum CodingKeys: String, CodingKey {
        case raisedAmount = "raised_amount"
        case spentExpensesAmount = "spent_expenses_amount"
        case lastActivityAt = "last_activity_at"
    }
}

struct GroupMomentDetailOut: Decodable {
    let moment: GroupMomentOut
    let members: [GroupMemberLedgerOut]
    let rules: GroupMomentRulesOut
    let budgetCategories: [GroupBudgetCategoryOut]
    let expenses: [GroupExpenseOut]
    let totals: GroupTotalsOut?

    enum CodingKeys: String, CodingKey {
        case moment
        case members
        case rules
        case budgetCategories = "budget_categories"
        case expenses
        case totals
    }
}

struct GroupExpenseOut: Codable, Identifiable {
    let expenseId: String
    let categoryKey: String
    let subcategory: String?
    let title: String
    let amount: Double
    let expenseDate: String
    let paidByMemberId: String?
    let paidByName: String?
    let splitMode: String?
    let status: String
    /// ISO or date string from API; used to pick the row created by the last POST.
    let createdAt: String?

    var id: String { expenseId }

    enum CodingKeys: String, CodingKey {
        case expenseId = "expense_id"
        case categoryKey = "category_key"
        case subcategory
        case title
        case amount
        case expenseDate = "expense_date"
        case paidByMemberId = "paid_by_member_id"
        case paidByName = "paid_by_name"
        case splitMode = "split_mode"
        case status
        case createdAt = "created_at"
    }
}

extension GroupMomentDetailOut {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        moment = try c.decode(GroupMomentOut.self, forKey: .moment)
        members = try c.decodeIfPresent([GroupMemberLedgerOut].self, forKey: .members) ?? []
        rules = try c.decode(GroupMomentRulesOut.self, forKey: .rules)
        budgetCategories = try c.decodeIfPresent([GroupBudgetCategoryOut].self, forKey: .budgetCategories) ?? []
        expenses = try c.decodeIfPresent([GroupExpenseOut].self, forKey: .expenses) ?? []
        totals = try c.decodeIfPresent(GroupTotalsOut.self, forKey: .totals)
    }
}

struct GroupInviteLinkOut: Codable {
    let joinUrl: String

    enum CodingKeys: String, CodingKey {
        case joinUrl = "join_url"
    }
}

struct GroupInviteEmailIn: Codable {
    let emails: [String]
    let message: String?
    let resend: Bool
}

struct GroupInviteEmailOut: Codable {
    let sent: Int
    let failed: Int
    let total: Int
    let errorMessages: [String]

    enum CodingKeys: String, CodingKey {
        case sent
        case failed
        case total
        case errorMessages = "error_messages"
    }
}

struct GroupPendingInviteOut: Codable, Identifiable {
    let inviteId: String
    let momentId: String
    let momentTitle: String
    let email: String
    let status: String
    let sentAt: String?
    let createdAt: String?
    let inviteToken: String

    var id: String { inviteId }

    enum CodingKeys: String, CodingKey {
        case inviteId = "invite_id"
        case momentId = "moment_id"
        case momentTitle = "moment_title"
        case email
        case status
        case sentAt = "sent_at"
        case createdAt = "created_at"
        case inviteToken = "invite_token"
    }
}

struct GroupPendingInvitesOut: Codable {
    let invites: [GroupPendingInviteOut]
}

struct GroupMomentRulesIn: Codable {
    let sendPaymentReminders: Bool
    let autoNotifyOnContribution: Bool
    let allowPartialPayments: Bool
    let requireReceiptForExpenses: Bool
    let requireOrganiserApproval: Bool

    enum CodingKeys: String, CodingKey {
        case sendPaymentReminders = "send_payment_reminders"
        case autoNotifyOnContribution = "auto_notify_on_contribution"
        case allowPartialPayments = "allow_partial_payments"
        case requireReceiptForExpenses = "require_receipt_for_expenses"
        case requireOrganiserApproval = "require_organiser_approval"
    }
}

struct GroupMomentPatchIn: Encodable {
    var title: String?
    var targetAmount: Double?
    var destination: String?
    var contributionDueDate: String?
    var rules: GroupMomentRulesIn?
    var status: String?

    enum CodingKeys: String, CodingKey {
        case title
        case targetAmount = "target_amount"
        case destination
        case contributionDueDate = "contribution_due_date"
        case rules
        case status
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(title, forKey: .title)
        try c.encodeIfPresent(targetAmount, forKey: .targetAmount)
        try c.encodeIfPresent(destination, forKey: .destination)
        try c.encodeIfPresent(contributionDueDate, forKey: .contributionDueDate)
        try c.encodeIfPresent(rules, forKey: .rules)
        try c.encodeIfPresent(status, forKey: .status)
    }
}

// MARK: - Receipt

struct ReceiptUploadOut: Codable {
    let receiptId: String
    let publicUrl: String
    let thumbnailUrl: String?
    let filePath: String
    let mimeType: String?
    let fileSizeBytes: Int?

    enum CodingKeys: String, CodingKey {
        case receiptId = "receipt_id"
        case publicUrl = "public_url"
        case thumbnailUrl = "thumbnail_url"
        case filePath = "file_path"
        case mimeType = "mime_type"
        case fileSizeBytes = "file_size_bytes"
    }
}

