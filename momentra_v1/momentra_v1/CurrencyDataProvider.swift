import Foundation

final class CurrencyDataProvider: ObservableObject {
    @Published private(set) var currencies: [CurrencyInfo] = []

    init() {
        self.currencies = CurrencyDataProvider.defaultCurrencies()
    }

    func info(for code: String) -> CurrencyInfo? {
        currencies.first { $0.code == code }
    }

    static func defaultCurrencies() -> [CurrencyInfo] {
        // Decimal rules:
        // 0: JPY, KRW, VND
        // 3: KWD, BHD, OMR
        // 2: others
        let zero = ["JPY","KRW","VND"]
        let three = ["KWD","BHD","OMR"]

        func minorUnit(for code: String) -> Int {
            if zero.contains(code) { return 0 }
            if three.contains(code) { return 3 }
            return 2
        }

        func sym(_ code: String) -> String {
            // Best-effort symbol via locale
            let loc = Locale(identifier: Locale.identifier(fromComponents: [NSLocale.Key.currencyCode.rawValue: code]))
            return loc.currencySymbol ?? code
        }

        func localeGuess(_ code: String) -> String {
            switch code {
            case "USD": return "en_US"
            case "EUR": return "de_DE"
            case "GBP": return "en_GB"
            case "INR": return "en_IN"
            case "SGD": return "en_SG"
            case "AED": return "en_AE"
            case "AUD": return "en_AU"
            case "CAD": return "en_CA"
            case "JPY": return "ja_JP"
            case "CNY": return "zh_CN"
            case "HKD": return "zh_HK"
            case "CHF": return "de_CH"
            case "NZD": return "en_NZ"
            case "SAR": return "ar_SA"
            case "QAR": return "ar_QA"
            case "KWD": return "ar_KW"
            case "BHD": return "ar_BH"
            case "OMR": return "ar_OM"
            case "MYR": return "ms_MY"
            case "IDR": return "id_ID"
            case "THB": return "th_TH"
            case "PHP": return "en_PH"
            case "VND": return "vi_VN"
            case "KRW": return "ko_KR"
            case "ZAR": return "en_ZA"
            case "BRL": return "pt_BR"
            case "MXN": return "es_MX"
            default: return Locale.current.identifier
            }
        }

        let names: [String: String] = [
            "USD": "US Dollar", "EUR": "Euro", "GBP": "British Pound", "INR": "Indian Rupee",
            "SGD": "Singapore Dollar", "AED": "UAE Dirham", "AUD": "Australian Dollar", "CAD": "Canadian Dollar",
            "JPY": "Japanese Yen", "CNY": "Chinese Yuan", "HKD": "Hong Kong Dollar", "CHF": "Swiss Franc",
            "NZD": "New Zealand Dollar", "SAR": "Saudi Riyal", "QAR": "Qatari Riyal", "KWD": "Kuwaiti Dinar",
            "BHD": "Bahraini Dinar", "OMR": "Omani Rial", "MYR": "Malaysian Ringgit", "IDR": "Indonesian Rupiah",
            "THB": "Thai Baht", "PHP": "Philippine Peso", "VND": "Vietnamese Dong", "KRW": "South Korean Won",
            "ZAR": "South African Rand", "BRL": "Brazilian Real", "MXN": "Mexican Peso"
        ]

        let supported = Array(names.keys).sorted()
        return supported.map { code in
            CurrencyInfo(code: code,
                         name: names[code] ?? code,
                         symbol: sym(code),
                         minorUnit: minorUnit(for: code),
                         localeIdentifier: localeGuess(code))
        }
    }
}
