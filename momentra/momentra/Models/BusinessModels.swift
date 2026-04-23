import Foundation

struct BusinessPendingInviteOut: Codable, Identifiable {
    let budgetId: String
    let budgetName: String
    let memberId: String
    let role: String
    let invitedAt: String?
    let inviteToken: String

    var id: String { memberId }

    enum CodingKeys: String, CodingKey {
        case budgetId = "budget_id"
        case budgetName = "budget_name"
        case memberId = "member_id"
        case role
        case invitedAt = "invited_at"
        case inviteToken = "invite_token"
    }
}

struct BusinessPendingInvitesOut: Codable {
    let invites: [BusinessPendingInviteOut]
}

struct BusinessBudgetTeamMemberOut: Codable, Identifiable {
    let memberId: String
    let displayName: String
    let role: String
    let firebaseUid: String?

    var id: String { memberId }

    enum CodingKeys: String, CodingKey {
        case memberId = "member_id"
        case displayName = "display_name"
        case role
        case firebaseUid = "firebase_uid"
    }
}

struct BusinessVendorBalanceOut: Codable {
    let vendorName: String
    let totalAmount: Double
    let paidAmount: Double
    let balanceAmount: Double

    enum CodingKeys: String, CodingKey {
        case vendorName = "vendor_name"
        case totalAmount = "total_amount"
        case paidAmount = "paid_amount"
        case balanceAmount = "balance_amount"
    }
}

struct BusinessVendorOut: Codable, Identifiable {
    let vendorId: String
    let vendorName: String

    var id: String { vendorId }

    enum CodingKeys: String, CodingKey {
        case vendorId = "vendor_id"
        case vendorName = "vendor_name"
    }
}

struct BusinessBudgetCreateOut: Codable, Identifiable {
    let budgetId: String
    let budgetName: String
    let budgetType: String?
    let status: String?
    let totalBudget: Double?
    let budgetPeriod: String?
    let department: String?
    let approvalThreshold: Double?
    let spentAmount: Double?
    let categories: [BusinessBudgetCategoryOut]
    let reminderPrefs: BusinessBudgetReminderPrefsOut?
    let teamMembers: [BusinessBudgetTeamMemberOut]?
    let vendorBalances: [BusinessVendorBalanceOut]?
    let vendors: [BusinessVendorOut]?

    var id: String { budgetId }

    enum CodingKeys: String, CodingKey {
        case budgetId = "budget_id"
        case budgetName = "budget_name"
        case budgetType = "budget_type"
        case status
        case totalBudget = "total_budget"
        case budgetPeriod = "budget_period"
        case department
        case approvalThreshold = "approval_threshold"
        case spentAmount = "spent_amount"
        case categories
        case reminderPrefs = "reminder_prefs"
        case teamMembers = "team_members"
        case vendorBalances = "vendor_balances"
        case vendors
    }
}

struct BusinessExpenseCreateIn: Encodable {
    let amount: Double
    let categoryId: String
    let title: String
    let subcategoryLabel: String
    let entryKind: String
    let expenseOrPurchase: String
    let paidMode: String?
    let purchasePaymentStatus: String?
    let quantity: Double?
    let unit: String?
    let pricePerUnit: Double?
    let totalAmount: Double?
    let paidAmount: Double?
    let vendorName: String?
    let receiptAttached: Bool

    enum CodingKeys: String, CodingKey {
        case amount
        case categoryId = "category_id"
        case title
        case subcategoryLabel = "subcategory_label"
        case entryKind = "entry_kind"
        case expenseOrPurchase = "expense_or_purchase"
        case paidMode = "paid_mode"
        case purchasePaymentStatus = "purchase_payment_status"
        case quantity
        case unit
        case pricePerUnit = "price_per_unit"
        case totalAmount = "total_amount"
        case paidAmount = "paid_amount"
        case vendorName = "vendor_name"
        case receiptAttached = "receipt_attached"
    }
}

struct BusinessBudgetListOut: Codable {
    let budgets: [BusinessBudgetCreateOut]
}

struct BusinessBudgetMemberIn: Codable {
    let initials: String?
    let displayName: String
    let role: String
    let limit: String?
    let added: Bool

    enum CodingKeys: String, CodingKey {
        case initials
        case displayName = "display_name"
        case role
        case limit
        case added
    }
}

struct BusinessBudgetCreateIn: Codable {
    let budgetName: String
    let budgetType: String
    let totalBudget: Double?
    let budgetPeriod: String
    let department: String
    let approvalThreshold: Double?
    let teamMembers: [BusinessBudgetMemberIn]
    let spendingPolicies: BusinessBudgetPoliciesIn
    let reminderPrefs: BusinessBudgetReminderPrefsOut

    enum CodingKeys: String, CodingKey {
        case budgetName = "budget_name"
        case budgetType = "budget_type"
        case totalBudget = "total_budget"
        case budgetPeriod = "budget_period"
        case department
        case approvalThreshold = "approval_threshold"
        case teamMembers = "team_members"
        case spendingPolicies = "spending_policies"
        case reminderPrefs = "reminder_prefs"
    }
}

struct BusinessBudgetPoliciesIn: Codable {
    let requireReceiptForAllExpenses: Bool
    let autoApproveBelowThreshold: Bool
    let managerApprovalRequired: Bool
    let notifyAdminOnSubmission: Bool
    let overBudgetAlerts: Bool
    let lockBudgetWhenLimitHit: Bool

    enum CodingKeys: String, CodingKey {
        case requireReceiptForAllExpenses = "require_receipt_for_all_expenses"
        case autoApproveBelowThreshold = "auto_approve_below_threshold"
        case managerApprovalRequired = "manager_approval_required"
        case notifyAdminOnSubmission = "notify_admin_on_submission"
        case overBudgetAlerts = "over_budget_alerts"
        case lockBudgetWhenLimitHit = "lock_budget_when_limit_hit"
    }
}

struct BusinessBudgetReminderPrefsOut: Codable {
    let weeklyDigest: Bool
    let pendingApprovalAlerts: Bool
    let overBudgetAlerts: Bool
    let periodCloseReminder: Bool

    enum CodingKeys: String, CodingKey {
        case weeklyDigest = "weekly_digest"
        case pendingApprovalAlerts = "pending_approval_alerts"
        case overBudgetAlerts = "over_budget_alerts"
        case periodCloseReminder = "period_close_reminder"
    }
}

struct BusinessBudgetReminderPrefsPatchIn: Codable {
    let weeklyDigest: Bool?
    let pendingApprovalAlerts: Bool?
    let overBudgetAlerts: Bool?
    let periodCloseReminder: Bool?

    enum CodingKeys: String, CodingKey {
        case weeklyDigest = "weekly_digest"
        case pendingApprovalAlerts = "pending_approval_alerts"
        case overBudgetAlerts = "over_budget_alerts"
        case periodCloseReminder = "period_close_reminder"
    }
}

struct BusinessBudgetCategoryOut: Codable, Identifiable {
    let categoryId: String
    let name: String
    let allocatedAmount: Double
    let spentAmount: Double

    var id: String { categoryId }

    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case name
        case allocatedAmount = "allocated_amount"
        case spentAmount = "spent_amount"
    }
}

struct BusinessCatalogCategoryOut: Codable, Identifiable {
    let templateCategoryId: String
    let budgetCategoryId: String
    let name: String
    let entryKind: String
    let sortOrder: Int
    let active: Bool
    let subcategories: [String]

    var id: String { "\(entryKind)-\(templateCategoryId)" }

    enum CodingKeys: String, CodingKey {
        case templateCategoryId = "template_category_id"
        case budgetCategoryId = "budget_category_id"
        case name
        case entryKind = "entry_kind"
        case sortOrder = "sort_order"
        case active
        case subcategories
    }
}

struct BusinessCatalogOut: Codable {
    let expense: [BusinessCatalogCategoryOut]
    let purchase: [BusinessCatalogCategoryOut]
}

struct BusinessBudgetCategoryAllocPatchIn: Codable {
    let categoryId: String
    let allocatedAmount: Double

    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case allocatedAmount = "allocated_amount"
    }
}

struct BusinessBudgetPatchIn: Codable {
    let budgetName: String?
    let budgetPeriod: String?
    let totalBudget: Double?
    let department: String?
    let approvalThreshold: Double?
    let spendingPolicies: BusinessBudgetPoliciesIn?
    let reminderPrefs: BusinessBudgetReminderPrefsPatchIn?
    let categories: [BusinessBudgetCategoryAllocPatchIn]?

    enum CodingKeys: String, CodingKey {
        case budgetName = "budget_name"
        case budgetPeriod = "budget_period"
        case totalBudget = "total_budget"
        case department
        case approvalThreshold = "approval_threshold"
        case spendingPolicies = "spending_policies"
        case reminderPrefs = "reminder_prefs"
        case categories
    }
}

