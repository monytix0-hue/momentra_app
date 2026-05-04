import SwiftUI

struct FintechCardView<Content: View>: View {
    let title: String?
    let subtitle: String?
    let content: Content

    init(title: String? = nil, subtitle: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title = title {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(FintechTheme.textPrimary)
            }
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(FintechTheme.textSecondary)
            }
            content
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(FintechTheme.surface)
                .shadow(color: .black.opacity(0.2), radius: 12, x: 0, y: 8)
        )
    }
}
