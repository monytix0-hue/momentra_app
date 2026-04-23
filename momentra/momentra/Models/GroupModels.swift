import Foundation

struct GroupMomentOut: Codable, Identifiable {
    let momentId: String
    let title: String
    let momentType: String?
    let targetAmount: Double?
    let destination: String?
    let contributionDueDate: String?
    let status: String?
    let raisedAmount: Double?

    var id: String { momentId }

    enum CodingKeys: String, CodingKey {
        case momentId = "moment_id"
        case title
        case momentType = "moment_type"
        case targetAmount = "target_amount"
        case destination
        case contributionDueDate = "contribution_due_date"
        case status
        case raisedAmount = "raised_amount"
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

struct GroupMomentDetailOut: Codable {
    let moment: GroupMomentOut
    let rules: GroupMomentRulesOut
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

struct GroupMomentPatchIn: Codable {
    let title: String?
    let targetAmount: Double?
    let destination: String?
    let contributionDueDate: String?
    let rules: GroupMomentRulesIn?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case title
        case targetAmount = "target_amount"
        case destination
        case contributionDueDate = "contribution_due_date"
        case rules
        case status
    }
}

