//
//  V1Models.swift
//  momentra
//

import Foundation

// MARK: - Loose JSON for health breakdown

enum V1JSONValue: Decodable, Hashable {
    case string(String)
    case double(Double)
    case int(Int)
    case bool(Bool)

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(Bool.self) {
            self = .bool(v)
            return
        }
        if let v = try? c.decode(Int.self) {
            self = .int(v)
            return
        }
        if let v = try? c.decode(Double.self) {
            self = .double(v)
            return
        }
        let v = try c.decode(String.self)
        self = .string(v)
    }

    var displayString: String {
        switch self {
        case .string(let s): return s
        case .double(let n):
            if n >= 0 && n <= 1.0, n != floor(n) { return String(format: "%.0f%%", n * 100) }
            return String(format: "%g", n)
        case .int(let i): return String(i)
        case .bool(let b): return b ? "Yes" : "No"
        }
    }
}

struct V1HealthOut: Decodable, Hashable {
    let momentId: String
    let compositeScore: Double
    let healthState: String
    let trend: String?
    let calculatedAt: Date
    let breakdown: [String: V1JSONValue]

    enum CodingKeys: String, CodingKey {
        case momentId = "moment_id"
        case compositeScore = "composite_score"
        case healthState = "health_state"
        case trend
        case calculatedAt = "calculated_at"
        case breakdown
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        momentId = try c.decode(String.self, forKey: .momentId)
        compositeScore = try c.decode(Double.self, forKey: .compositeScore)
        healthState = try c.decode(String.self, forKey: .healthState)
        trend = try c.decodeIfPresent(String.self, forKey: .trend)
        calculatedAt = try c.decode(Date.self, forKey: .calculatedAt)
        breakdown = (try c.decodeIfPresent([String: V1JSONValue].self, forKey: .breakdown)) ?? [:]
    }
}

struct V1CommitmentOut: Decodable, Hashable, Identifiable {
    var id: String { commitmentId }

    let commitmentId: String
    let momentId: String
    let memberId: String?
    let displayName: String?
    let email: String?
    let committedAmount: Double
    let fulfilledAmount: Double
    let amountRemaining: Double
    let dueDate: String?
    let status: String
    let overdueDays: Int

    enum CodingKeys: String, CodingKey {
        case commitmentId = "commitment_id"
        case momentId = "moment_id"
        case memberId = "member_id"
        case displayName = "display_name"
        case email
        case committedAmount = "committed_amount"
        case fulfilledAmount = "fulfilled_amount"
        case amountRemaining = "amount_remaining"
        case dueDate = "due_date"
        case status
        case overdueDays = "overdue_days"
    }
}

struct V1SignalOut: Decodable, Hashable, Identifiable {
    var id: String { signalId }

    let signalId: String
    let momentId: String
    let scopeType: String
    let signalType: String
    let severity: String
    let title: String
    let message: String
    let resolved: Bool
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case signalId = "signal_id"
        case momentId = "moment_id"
        case scopeType = "scope_type"
        case signalType = "signal_type"
        case severity, title, message, resolved
        case createdAt = "created_at"
    }
}

struct V1GuidanceOut: Decodable, Hashable, Identifiable {
    var id: String { guidanceId }

    let guidanceId: String
    let momentId: String
    let title: String
    let message: String
    let priority: Int
    let read: Bool
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case guidanceId = "guidance_id"
        case momentId = "moment_id"
        case title, message, priority, read
        case createdAt = "created_at"
    }
}
