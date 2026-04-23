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
}

