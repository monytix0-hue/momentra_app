//
//  InviteLinkParser.swift
//  momentra
//

import Foundation

enum InviteLinkKind {
    case group
    case business
}

struct ParsedInviteLink {
    let kind: InviteLinkKind
    let token: String
}

enum InviteLinkParser {
    static func parse(url: URL) -> ParsedInviteLink? {
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if path.hasPrefix("business/join/") {
            let raw = String(path.dropFirst("business/join/".count))
            let token = raw.removingPercentEncoding ?? raw
            if token.isEmpty { return nil }
            return ParsedInviteLink(kind: .business, token: token)
        }
        if path.hasPrefix("join/") {
            let raw = String(path.dropFirst("join/".count))
            let token = raw.removingPercentEncoding ?? raw
            if token.isEmpty { return nil }
            return ParsedInviteLink(kind: .group, token: token)
        }
        return nil
    }

    /// QR may contain a full URL or a bare token (treated as group).
    static func parsePayload(_ raw: String) -> ParsedInviteLink? {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return nil }
        if let u = URL(string: t), u.scheme == "http" || u.scheme == "https" {
            return parse(url: u)
        }
        if t.count >= 32, t.allSatisfy({ $0.isLetter || $0.isNumber }) {
            return ParsedInviteLink(kind: .group, token: t)
        }
        return nil
    }
}
