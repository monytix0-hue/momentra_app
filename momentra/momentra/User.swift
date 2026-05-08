//
//  User.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import Foundation

struct MomentraUser: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let phoneNumber: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case phoneNumber = "phone_number"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: MomentraUser
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct TokenExchangeRequest: Codable {
    let firebaseToken: String
    
    enum CodingKeys: String, CodingKey {
        case firebaseToken = "firebase_token"
    }
}

enum PrimaryFocus: String, Codable, CaseIterable {
    case personal
    case group
    case business
}

struct MeResponse: Codable {
    let uid: String?
    let email: String?
    let phoneNumber: String?
    let displayName: String?
    let primaryUse: String?
    let primaryFocus: PrimaryFocus?
    let defaultCurrency: String?
    let organizationName: String?
    let setupCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case uid
        case email
        case phoneNumber = "phone_number"
        case displayName = "display_name"
        case primaryUse = "primary_use"
        case primaryFocus = "primary_focus"
        case defaultCurrency = "default_currency"
        case organizationName = "organization_name"
        case setupCompleted = "setup_completed"
    }
}

struct SyncUserProfileRequest: Codable {
    let displayName: String?
    let photoURL: String?
    let upiOrPhone: String?
    let primaryUse: String?
    let primaryFocus: String?
    let defaultCurrency: String?
    let organizationName: String?
    let setupCompleted: Bool?

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case photoURL = "photo_url"
        case upiOrPhone = "upi_or_phone"
        case primaryUse = "primary_use"
        case primaryFocus = "primary_focus"
        case defaultCurrency = "default_currency"
        case organizationName = "organization_name"
        case setupCompleted = "setup_completed"
    }
}
