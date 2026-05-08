import SwiftUI

struct PersonalShellView: View {
    @EnvironmentObject private var currencyProvider: CurrencyDataProvider
    @EnvironmentObject private var preferences: UserPreferencesStore

    @State private var selectedTab: PersonalTab = .today
    @State private var showAddSheet: Bool = false
    @State private var selectedMonth: Date = Date()

    var body: some View {
        ZStack {
            FintechTheme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                PersonalHeaderView(
                    greeting: greeting(),
                    selectedMonth: $selectedMonth,
                    selectedCurrencyCode: $preferences.primaryCurrencyCode
                )

                Divider().opacity(0)

                PersonalTabContentView(tab: selectedTab)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                PersonalBottomNavBar(selected: $selectedTab)
                    .padding(.bottom, 8)
                    .background(.ultraThinMaterial)
            }

            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(Color.white)
                            .padding(20)
                            .background(
                                Circle()
                                    .fill(FintechTheme.gradient)
                            )
                            .shadow(color: FintechTheme.accent.opacity(0.6), radius: 12, x: 0, y: 8)
                    }
                    .accessibilityLabel("Add")
                    .padding(.trailing, 20)
                    .padding(.bottom, 86) // lifted above tab bar
                }
            }
        }
        .sheet(isPresented: $showAddSheet) {
            PersonalAddActionSheet(isPresented: $showAddSheet)
                .presentationDetents([.medium, .large])
                .presentationBackground(.regularMaterial)
        }
        .environment(\.colorScheme, .dark)
        .onAppear {
            // Ensure selected currency is valid
            if currencyProvider.info(for: preferences.primaryCurrencyCode) == nil {
                preferences.primaryCurrencyCode = "USD"
            }
        }
    }

    private func greeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default: return "Hello"
        }
    }
}
