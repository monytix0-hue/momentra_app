import Foundation

struct Money: Hashable, Sendable {
    var amountMinor: Int64
    var currencyCode: String

    init(amountMinor: Int64, currencyCode: String) {
        self.amountMinor = amountMinor
        self.currencyCode = currencyCode
    }

    func adding(_ other: Money) -> Money? {
        guard other.currencyCode == currencyCode else { return nil }
        return Money(amountMinor: amountMinor + other.amountMinor, currencyCode: currencyCode)
    }

    func negated() -> Money {
        Money(amountMinor: -amountMinor, currencyCode: currencyCode)
    }
}
