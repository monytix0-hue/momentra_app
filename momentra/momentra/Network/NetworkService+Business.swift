import Foundation

extension NetworkService {
    func businessPendingInvites(token: String) async throws -> BusinessPendingInvitesOut {
        try await request(endpoint: "/business/moments/invites/pending", method: "GET", token: token)
    }

    func declineBusinessInvite(memberId: String, token: String) async throws -> [String: String] {
        try await request(
            endpoint: "/business/moments/invites/\(memberId)/decline",
            method: "POST",
            body: EmptyEncodable(),
            token: token
        )
    }

    func businessInviteLink(budgetId: String, token: String) async throws -> GroupInviteLinkOut {
        try await request(
            endpoint: "/business/moments/\(budgetId)/invites/link",
            method: "POST",
            body: EmptyEncodable(),
            token: token
        )
    }

    func sendBusinessInviteEmails(budgetId: String, body: GroupInviteEmailIn, token: String) async throws -> GroupInviteEmailOut {
        try await request(
            endpoint: "/business/moments/\(budgetId)/invites/email",
            method: "POST",
            body: body,
            token: token
        )
    }

    func joinBusinessBudget(budgetId: String, token: String) async throws -> BusinessBudgetCreateOut {
        try await request(
            endpoint: "/business/budgets/\(budgetId)/members/join",
            method: "POST",
            token: token
        )
    }

    func joinBusinessWithToken(rawToken: String, token: String) async throws -> [String: String] {
        let enc = rawToken.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? rawToken
        return try await request(endpoint: "/business/join/\(enc)", method: "POST", token: token)
    }

    func createBusinessExpense(budgetId: String, body: BusinessExpenseCreateIn, token: String) async throws -> BusinessBudgetCreateOut {
        try await request(
            endpoint: "/business/budgets/\(budgetId)/expenses",
            method: "POST",
            body: body,
            token: token
        )
    }

    func businessBudgetCatalog(budgetId: String, token: String) async throws -> BusinessCatalogOut {
        try await request(
            endpoint: "/business/budgets/\(budgetId)/catalog",
            method: "GET",
            token: token
        )
    }

    func approveBusinessBudgetApproval(budgetId: String, approvalId: String, token: String) async throws -> BusinessBudgetCreateOut {
        try await request(
            endpoint: "/business/budgets/\(budgetId)/approvals/\(approvalId)/approve",
            method: "POST",
            body: EmptyEncodable(),
            token: token
        )
    }

    func rejectBusinessBudgetApproval(budgetId: String, approvalId: String, token: String) async throws -> BusinessBudgetCreateOut {
        try await request(
            endpoint: "/business/budgets/\(budgetId)/approvals/\(approvalId)/reject",
            method: "POST",
            body: EmptyEncodable(),
            token: token
        )
    }

    func addBusinessBudgetMember(budgetId: String, body: BusinessBudgetMemberIn, token: String) async throws -> BusinessBudgetCreateOut {
        try await request(
            endpoint: "/business/budgets/\(budgetId)/members",
            method: "POST",
            body: body,
            token: token
        )
    }

    // MARK: - Workspace v2

    func listBusinessWorkspaces(token: String) async throws -> [BusinessWorkspaceOut] {
        try await request(endpoint: "/business/workspaces", method: "GET", token: token)
    }

    func listBusinessUnits(workspaceId: String, token: String) async throws -> [BusinessUnitOut] {
        try await request(endpoint: "/business/workspaces/\(workspaceId)/units", method: "GET", token: token)
    }

    func createBusinessWorkspaceSpend(
        workspaceId: String,
        body: BusinessWorkspaceSpendCreateIn,
        token: String
    ) async throws -> BusinessWorkspaceSpendOut {
        try await request(
            endpoint: "/business/workspaces/\(workspaceId)/spends",
            method: "POST",
            body: body,
            token: token
        )
    }
}

