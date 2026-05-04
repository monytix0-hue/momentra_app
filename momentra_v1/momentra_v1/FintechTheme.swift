import SwiftUI

struct FintechTheme {
    static let background = Color(.sRGB, red: 0.07, green: 0.08, blue: 0.10, opacity: 1)
    static let surface = Color(.sRGB, red: 0.12, green: 0.13, blue: 0.16, opacity: 1)
    static let surfaceAlt = Color(.sRGB, red: 0.16, green: 0.17, blue: 0.20, opacity: 1)
    static let accent = Color(.sRGB, red: 0.36, green: 0.69, blue: 0.99, opacity: 1)
    static let positive = Color(.sRGB, red: 0.31, green: 0.80, blue: 0.45, opacity: 1)
    static let warning = Color(.sRGB, red: 0.98, green: 0.80, blue: 0.35, opacity: 1)
    static let danger = Color(.sRGB, red: 0.98, green: 0.40, blue: 0.40, opacity: 1)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.7)
    static let gradient = LinearGradient(colors: [accent, Color.purple], startPoint: .topLeading, endPoint: .bottomTrailing)
}
