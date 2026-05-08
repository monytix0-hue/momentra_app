import Foundation

struct CurrencyInfo: Hashable, Identifiable, Sendable {
    var id: String { code }
    let code: String
    let name: String
    let symbol: String
    let minorUnit: Int
    let localeIdentifier: String
}
