import Foundation

struct CurrencyFormatter {
    static func string(for money: Money, using info: CurrencyInfo, localeIdentifier: String? = nil) -> String {
        // Avoid Double: build integer and decimal parts from minor units
        let minorUnit = info.minorUnit
        let isNegative = money.amountMinor < 0
        let absMinor = Int64(abs(money.amountMinor))

        let divisor = Int64(pow10(minorUnit))
        let major = absMinor / divisor
        let fraction = absMinor % divisor

        let localeID = localeIdentifier ?? info.localeIdentifier
        var locale = Locale(identifier: localeID)
        // Ensure the currency code matches
        var components = locale.identifier
        // Not strictly necessary; NumberFormatter will use locale + currency code.

        let nf = NumberFormatter()
        nf.locale = locale
        nf.numberStyle = .currency
        nf.currencyCode = info.code
        nf.currencySymbol = info.symbol
        nf.minimumFractionDigits = minorUnit
        nf.maximumFractionDigits = minorUnit

        // Construct Decimal without floating point rounding
        var decimalString: String
        if minorUnit == 0 {
            decimalString = "\(major)"
        } else {
            let fractionString = String(format: "%0*\(minorUnit)lld", minorUnit, fraction)
            decimalString = "\(major).\(fractionString)"
        }

        // Use Decimal to feed NumberFormatter safely
        let decimal = Decimal(string: decimalString) ?? 0
        let signed = isNegative ? decimal * -1 : decimal

        return nf.string(for: signed as NSDecimalNumber) ?? "\(isNegative ? "-" : "")\(info.symbol)\(decimalString)"
    }

    private static func pow10(_ exp: Int) -> Int {
        var result = 1
        if exp <= 0 { return 1 }
        for _ in 0..<exp { result *= 10 }
        return result
    }
}
