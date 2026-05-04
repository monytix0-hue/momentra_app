//
//  V1MomentId.swift
//  momentra
//

import Foundation

/// Maps a legacy moment id to `/v1/moments/...` (`p_` / `g_` / `b_`). Circle has no v1 moment.
func v1MomentId(context: MomentraContext, rawId: String) -> String? {
    let id = rawId.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !id.isEmpty else { return nil }
    switch context {
    case .personal:
        return "p_\(id)"
    case .group:
        return "g_\(id)"
    case .business:
        return "b_\(id)"
    case .circle:
        return nil
    }
}
