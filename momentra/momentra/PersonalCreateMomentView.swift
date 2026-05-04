import SwiftUI

struct PersonalCreateMomentView: View {
    let preset: PersonalQuickTemplate?
    let sheetId: Int
    let isSubmitting: Bool
    let onCancel: () -> Void
    let onCreate: (PersonalMomentCreateIn) -> Void

    @State private var title: String = ""
    @State private var rhythmMonthly: Bool = true
    @State private var startDateIso: String = calendarDateIso()
    @State private var endDateIso: String = calendarDateIsoPlusYears(1)
    @State private var targetAmount: String = ""
    @State private var description: String = ""
    @State private var isPrivateMoment: Bool = true
    @State private var validationError: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                Picker("Rhythm", selection: $rhythmMonthly) {
                    Text("Monthly").tag(true)
                    Text("Ends on date").tag(false)
                }
                .pickerStyle(.segmented)
                TextField("Start date (YYYY-MM-DD)", text: $startDateIso)
                if !rhythmMonthly {
                    TextField("End date (YYYY-MM-DD)", text: $endDateIso)
                }
                TextField("Target amount (optional)", text: $targetAmount)
                    .keyboardType(.decimalPad)
                TextField("Description (optional)", text: $description, axis: .vertical)
                    .lineLimit(2...4)
                Toggle("Private moment", isOn: $isPrivateMoment)
                if let validationError, !validationError.isEmpty {
                    Text(validationError).foregroundColor(DesignTokens.urgency.highText)
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("New moment")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel).disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Create") { submit() }
                    }
                }
            }
        }
        .tint(DesignTokens.personal.accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .id(sheetId)
        .onAppear {
            applyPreset()
        }
    }

    private func applyPreset() {
        guard let preset else {
            title = ""
            rhythmMonthly = true
            startDateIso = calendarDateIso()
            endDateIso = calendarDateIsoPlusYears(1)
            targetAmount = ""
            description = ""
            return
        }
        title = preset.title
        rhythmMonthly = preset.durationType == PersonalMomentDuration.recurringMonthly
        startDateIso = preset.startDateIso ?? calendarDateIso()
        if preset.durationType == PersonalMomentDuration.fixedEnd {
            endDateIso = preset.endDateIso ?? calendarDateIsoPlusYears(1)
        } else {
            endDateIso = calendarDateIsoPlusYears(1)
        }
        if let t = preset.targetAmount {
            targetAmount = String(format: "%g", t)
        } else {
            targetAmount = ""
        }
        description = preset.description ?? ""
    }

    private func submit() {
        validationError = nil
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty {
            validationError = "Enter a title"
            return
        }
        if !rhythmMonthly && endDateIso.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            validationError = "Enter an end date"
            return
        }
        let duration = rhythmMonthly ? PersonalMomentDuration.recurringMonthly : PersonalMomentDuration.fixedEnd
        let target = Double(targetAmount.trimmingCharacters(in: .whitespacesAndNewlines))
        let body = PersonalMomentCreateIn(
            title: t,
            momentType: preset?.momentType ?? "goal",
            durationType: duration,
            targetAmount: target,
            startDate: startDateIso.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : startDateIso,
            endDate: rhythmMonthly ? nil : endDateIso,
            savingMode: rhythmMonthly ? "monthly" : nil,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : description,
            milestones: [],
            status: "active",
            isPrivateMoment: isPrivateMoment,
            weeklyReminders: true,
            milestoneAlerts: true,
            lowVelocityWarning: false,
            autoArchiveOnComplete: true,
            notifyViaPush: true,
            notifyViaWhatsapp: false,
            notifyViaEmail: true
        )
        onCreate(body)
    }
}
