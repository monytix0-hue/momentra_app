//
//  NetworkService.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import Foundation

private let iso8601DecoderWithFractionalSeconds: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

private let iso8601DecoderStandard: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
}()

enum NetworkError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case decodingError
    case serverError(String)
    case unauthorized
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid server response"
        case .decodingError:
            return "Failed to decode response"
        case .serverError(let message):
            return message
        case .unauthorized:
            return "Unauthorized access"
        case .networkError(let error):
            return error.localizedDescription
        }
    }
}

@MainActor
class NetworkService {
    static let shared = NetworkService()

    /// Set `API_BASE_URL` in Info.plist (e.g. `https://backend.mallaapp.org`).
    private var baseURL: String {
        if let url = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String, !url.isEmpty {
            return normalizedBaseURL(url)
        }
        return "https://backend.mallaapp.org"
    }

    /// Accepts bare local IPs (e.g. `192.168.68.122`) and normalizes to a full HTTP URL.
    private func normalizedBaseURL(_ raw: String) -> String {
        var value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        value = value.trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        if !value.hasPrefix("http://") && !value.hasPrefix("https://") {
            value = "http://\(value)"
        }

        if let components = URLComponents(string: value),
           components.port == nil,
           components.scheme?.lowercased() == "http" {
            value += ":8002"
        }

        return value
    }

    private let session: URLSession

    private let jsonDecoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            if let parsed =
                iso8601DecoderWithFractionalSeconds.date(from: value) ??
                iso8601DecoderStandard.date(from: value)
            {
                return parsed
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid ISO-8601 date: \(value)"
            )
        }
        return d
    }()

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    /// Exchange Firebase token for backend access token
    func exchangeToken(firebaseToken: String) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/api/auth/exchange") else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = TokenExchangeRequest(firebaseToken: firebaseToken)
        request.httpBody = try JSONEncoder().encode(body)
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    let authResponse = try jsonDecoder.decode(AuthResponse.self, from: data)
                    return authResponse
                } catch {
                    throw NetworkError.decodingError
                }
            case 401:
                throw NetworkError.unauthorized
            default:
                if let errorMessage = try? JSONDecoder().decode([String: String].self, from: data),
                   let message = errorMessage["message"] {
                    throw NetworkError.serverError(message)
                }
                throw NetworkError.serverError("Server error: \(httpResponse.statusCode)")
            }
        } catch let error as NetworkError {
            throw error
        } catch {
            throw NetworkError.networkError(error)
        }
    }
    
    /// Raw JSON body for successful (2xx) responses; shared error handling with ``request``.
    private func dataForAuthorizedRequest(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        token: String? = nil
    ) async throws -> Data {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }

            switch httpResponse.statusCode {
            case 200...299:
                return data
            case 401:
                throw NetworkError.unauthorized
            default:
                if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = obj["detail"] {
                    if let s = detail as? String {
                        throw NetworkError.serverError(s)
                    }
                    if let arr = detail as? [[String: Any]],
                       let first = arr.first,
                       let msg = first["msg"] as? String {
                        throw NetworkError.serverError(msg)
                    }
                }
                if let errorMessage = try? JSONDecoder().decode([String: String].self, from: data),
                   let message = errorMessage["message"] {
                    throw NetworkError.serverError(message)
                }
                throw NetworkError.serverError("Server error: \(httpResponse.statusCode)")
            }
        } catch let error as NetworkError {
            throw error
        } catch {
            throw NetworkError.networkError(error)
        }
    }

    /// Monolith returns `{ "moments": [...] }`; modular personal router returns a bare JSON array.
    func fetchPersonalMoments(token: String) async throws -> [PersonalMomentItemOut] {
        let data = try await dataForAuthorizedRequest(endpoint: "/personal/moments", method: "GET", token: token)
        if let wrapped = try? jsonDecoder.decode(PersonalMomentListResponse.self, from: data) {
            return wrapped.moments
        }
        do {
            return try jsonDecoder.decode([PersonalMomentItemOut].self, from: data)
        } catch {
            throw NetworkError.decodingError
        }
    }

    func createPersonalMoment(body: PersonalMomentCreateIn, token: String) async throws -> PersonalMomentCreateOut {
        try await request(endpoint: "/personal/moments", method: "POST", body: body, token: token)
    }

    func patchPersonalMoment(momentId: String, body: PersonalMomentPatchIn, token: String) async throws -> PersonalMomentItemOut {
        try await request(endpoint: "/personal/moments/\(momentId)", method: "PATCH", body: body, token: token)
    }

    func deletePersonalMoment(momentId: String, token: String) async throws {
        try await requestNoContent(endpoint: "/personal/moments/\(momentId)", method: "DELETE", token: token)
    }

    func createPersonalTransaction(body: PersonalTransactionCreateIn, token: String) async throws -> PersonalTransactionOut {
        try await request(endpoint: "/personal/transactions", method: "POST", body: body, token: token)
    }

    func patchPersonalTransaction(transactionId: String, body: PersonalTransactionPatchIn, token: String) async throws -> PersonalTransactionOut {
        try await request(endpoint: "/personal/transactions/\(transactionId)", method: "PATCH", body: body, token: token)
    }

    func deletePersonalTransaction(transactionId: String, token: String) async throws {
        try await requestNoContent(endpoint: "/personal/transactions/\(transactionId)", method: "DELETE", token: token)
    }

    /// Generic API request with authentication
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        token: String? = nil
    ) async throws -> T {
        let data = try await dataForAuthorizedRequest(endpoint: endpoint, method: method, body: body, token: token)
        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError
        }
    }

    /// Request for endpoints that return 204 or empty body.
    func requestNoContent(
        endpoint: String,
        method: String = "DELETE",
        body: Encodable? = nil,
        token: String? = nil
    ) async throws {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }

            switch httpResponse.statusCode {
            case 200...299:
                return
            case 401:
                throw NetworkError.unauthorized
            default:
                if let errorMessage = try? JSONDecoder().decode([String: String].self, from: data),
                   let message = errorMessage["detail"] ?? errorMessage["message"] {
                    throw NetworkError.serverError(message)
                }
                throw NetworkError.serverError("Server error: \(httpResponse.statusCode)")
            }
        } catch let error as NetworkError {
            throw error
        } catch {
            throw NetworkError.networkError(error)
        }
    }

    func uploadBusinessApprovalReceipt(
        budgetId: String,
        approvalId: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        token: String
    ) async throws -> BusinessBudgetCreateOut {
        guard let url = URL(string: "\(baseURL)/business/budgets/\(budgetId)/approvals/\(approvalId)/receipt") else {
            throw NetworkError.invalidURL
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let prefix = "--\(boundary)\r\n"
        let disposition = "Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n"
        let ctype = "Content-Type: \(mimeType)\r\n\r\n"
        let suffix = "\r\n--\(boundary)--\r\n"
        guard
            let pD = prefix.data(using: .utf8),
            let dD = disposition.data(using: .utf8),
            let cD = ctype.data(using: .utf8),
            let sD = suffix.data(using: .utf8)
        else {
            throw NetworkError.invalidURL
        }
        body.append(pD)
        body.append(dD)
        body.append(cD)
        body.append(fileData)
        body.append(sD)
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        switch httpResponse.statusCode {
        case 200...299:
            return try jsonDecoder.decode(BusinessBudgetCreateOut.self, from: data)
        case 401:
            throw NetworkError.unauthorized
        default:
            if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = obj["detail"] {
                if let s = detail as? String {
                    throw NetworkError.serverError(s)
                }
            }
            throw NetworkError.serverError("Server error: \(httpResponse.statusCode)")
        }
    }

    /// Multipart receipt for an existing group expense (`POST /group/moments/{momentId}/expenses/{expenseId}/receipt`).
    func uploadGroupExpenseReceipt(
        momentId: String,
        expenseId: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        token: String
    ) async throws -> GroupMomentDetailOut {
        guard let url = URL(string: "\(baseURL)/group/moments/\(momentId)/expenses/\(expenseId)/receipt") else {
            throw NetworkError.invalidURL
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let prefix = "--\(boundary)\r\n"
        let disposition = "Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n"
        let ctype = "Content-Type: \(mimeType)\r\n\r\n"
        let suffix = "\r\n--\(boundary)--\r\n"
        guard
            let pD = prefix.data(using: .utf8),
            let dD = disposition.data(using: .utf8),
            let cD = ctype.data(using: .utf8),
            let sD = suffix.data(using: .utf8)
        else {
            throw NetworkError.invalidURL
        }
        body.append(pD)
        body.append(dD)
        body.append(cD)
        body.append(fileData)
        body.append(sD)
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        switch httpResponse.statusCode {
        case 200...299:
            return try jsonDecoder.decode(GroupMomentDetailOut.self, from: data)
        case 401:
            throw NetworkError.unauthorized
        default:
            if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = obj["detail"] {
                if let s = detail as? String {
                    throw NetworkError.serverError(s)
                }
            }
            throw NetworkError.serverError("Server error: \(httpResponse.statusCode)")
        }
    }

    /// Authenticated upload to `POST /storage/upload/{bucket}/{path}` (multipart field `file`).
    func uploadStorageObject(
        bucket: String,
        objectPath: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        token: String
    ) async throws -> StorageUploadOut {
        let encBucket = bucket.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? bucket
        let encPath = objectPath.split(separator: "/").map { segment in
            String(segment).addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String(segment)
        }.joined(separator: "/")
        guard let url = URL(string: "\(baseURL)/storage/upload/\(encBucket)/\(encPath)") else {
            throw NetworkError.invalidURL
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let prefix = "--\(boundary)\r\n"
        let disposition = "Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n"
        let ctype = "Content-Type: \(mimeType)\r\n\r\n"
        let suffix = "\r\n--\(boundary)--\r\n"
        guard
            let pD = prefix.data(using: .utf8),
            let dD = disposition.data(using: .utf8),
            let cD = ctype.data(using: .utf8),
            let sD = suffix.data(using: .utf8)
        else {
            throw NetworkError.invalidURL
        }
        body.append(pD)
        body.append(dD)
        body.append(cD)
        body.append(fileData)
        body.append(sD)
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        switch httpResponse.statusCode {
        case 200...299:
            return try jsonDecoder.decode(StorageUploadOut.self, from: data)
        case 401:
            throw NetworkError.unauthorized
        default:
            if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = obj["detail"] {
                if let s = detail as? String {
                    throw NetworkError.serverError(s)
                }
            }
            throw NetworkError.serverError("Server error: \(httpResponse.statusCode)")
        }
    }
}

struct EmptyEncodable: Encodable {}
