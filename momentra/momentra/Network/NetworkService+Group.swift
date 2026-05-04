import Foundation

extension NetworkService {
    func groupPendingInvites(token: String) async throws -> GroupPendingInvitesOut {
        try await request(endpoint: "/group/moments/invites/pending", method: "GET", token: token)
    }

    func declineGroupInvite(inviteId: String, token: String) async throws -> [String: String] {
        try await request(
            endpoint: "/group/moments/invites/\(inviteId)/decline",
            method: "POST",
            body: EmptyEncodable(),
            token: token
        )
    }

    func joinGroupWithToken(rawToken: String, token: String) async throws -> [String: String] {
        let enc = rawToken.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? rawToken
        return try await request(endpoint: "/group/join/\(enc)", method: "POST", token: token)
    }

    func createGroupMoment(body: GroupMomentCreateIn, token: String) async throws -> GroupMomentOut {
        try await request(endpoint: "/group/moments", method: "POST", body: body, token: token)
    }

    func groupInviteLink(momentId: String, token: String) async throws -> GroupInviteLinkOut {
        try await request(
            endpoint: "/group/moments/\(momentId)/invites/link",
            method: "POST",
            body: EmptyEncodable(),
            token: token
        )
    }

    func sendGroupInviteEmails(momentId: String, body: GroupInviteEmailIn, token: String) async throws -> GroupInviteEmailOut {
        try await request(
            endpoint: "/group/moments/\(momentId)/invites/email",
            method: "POST",
            body: body,
            token: token
        )
    }

    func createGroupExpense(momentId: String, body: GroupExpenseCreateIn, token: String) async throws -> GroupMomentDetailOut {
        try await request(
            endpoint: "/group/moments/\(momentId)/expenses",
            method: "POST",
            body: body,
            token: token
        )
    }

    func patchGroupMoment(momentId: String, body: GroupMomentPatchIn, token: String) async throws -> GroupMomentDetailOut {
        try await request(
            endpoint: "/group/moments/\(momentId)",
            method: "PATCH",
            body: body,
            token: token
        )
    }

    func deleteGroupMoment(momentId: String, token: String) async throws {
        try await requestNoContent(endpoint: "/group/moments/\(momentId)", method: "DELETE", token: token)
    }
}
