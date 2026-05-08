import Foundation
import Combine

final class UserPreferencesStore: ObservableObject {
    @Published var primaryCurrencyCode: String
    @Published var localeIdentifier: String
    @Published var timezoneIdentifier: String

    init(primaryCurrencyCode: String = "USD",
         localeIdentifier: String = Locale.current.identifier,
         timezoneIdentifier: String = TimeZone.current.identifier) {
        self.primaryCurrencyCode = primaryCurrencyCode
        self.localeIdentifier = localeIdentifier
        self.timezoneIdentifier = timezoneIdentifier
    }
}
