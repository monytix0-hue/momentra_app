import SwiftUI

struct PersonalHeaderView: View {
    @EnvironmentObject private var currencyProvider: CurrencyDataProvider
    @EnvironmentObject private var preferences: UserPreferencesStore

    let greeting: String
    @Binding var selectedMonth: Date
    @Binding var selectedCurrencyCode: String

    @State private var showCurrencySelector = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(greeting)
                    .font(.largeTitle.bold())
                    .foregroundStyle(FintechTheme.textPrimary)
                Spacer()
                Button {
                    showCurrencySelector = true
                } label: {
                    HStack(spacing: 6) {
                        Text(currentCurrencySymbol())
                            .font(.headline)
                            .foregroundStyle(FintechTheme.textPrimary)
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .foregroundStyle(FintechTheme.textSecondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        Capsule().fill(FintechTheme.surfaceAlt)
                    )
                }
                .accessibilityLabel("Select Primary Currency")
            }

            HStack(spacing: 12) {
                MonthSelector(selectedMonth: $selectedMonth)
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, 8)
        .background(FintechTheme.background.opacity(0.95))
        .sheet(isPresented: $showCurrencySelector) {
            CurrencySelectorView(
                selectedCode: $selectedCurrencyCode
            )
            .presentationDetents([.medium, .large])
        }
    }

    private func currentCurrencySymbol() -> String {
        if let info = currencyProvider.info(for: selectedCurrencyCode) {
            return info.symbol
        }
        return selectedCurrencyCode
    }
}

private struct MonthSelector: View {
    @Binding var selectedMonth: Date

    var body: some View {
        HStack(spacing: 8) {
            Button {
                withAnimation {
                    changeMonth(-1)
                }
            } label: {
                Image(systemName: "chevron.left")
                    .foregroundStyle(FintechTheme.textSecondary)
            }
            Text(selectedMonth, format: .dateTime.month(.wide).year())
                .font(.headline)
                .foregroundStyle(FintechTheme.textPrimary)
                .frame(minWidth: 140)
            Button {
                withAnimation {
                    changeMonth(1)
                }
            } label: {
                Image(systemName: "chevron.right")
                    .foregroundStyle(FintechTheme.textSecondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 12).fill(FintechTheme.surfaceAlt))
    }

    private func changeMonth(_ delta: Int) {
        if let newDate = Calendar.current.date(byAdding: .month, value: delta, to: selectedMonth) {
            selectedMonth = newDate
        }
    }
}
