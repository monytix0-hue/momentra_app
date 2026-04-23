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
}

