//
//  NetworkService.swift
//  momentra
//
//  Created by santosh on 19/04/26.
//

import Foundation

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
        d.dateDecodingStrategy = .iso8601
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
    
    /// Generic API request with authentication
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        token: String? = nil
    ) async throws -> T {
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
                do {
                    let result = try jsonDecoder.decode(T.self, from: data)
                    return result
                } catch {
                    throw NetworkError.decodingError
                }
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
}

struct EmptyEncodable: Encodable {}
