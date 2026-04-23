//
//  ContextRouterView.swift
//  momentra
//

import SwiftUI
import Combine

private struct HomeListItem: Identifiable, Hashable {
    let id: String
    let title: String
    let context: MomentraContext
    let type: String?
    let status: String?
    let targetAmount: Double?
    let durationType: String?
    let startDate: String?
    let endDate: String?
    let description: String?
    let savingMode: String?
    let isPrivateMoment: Bool
}

private struct PersonalTxnDraft {
    var isIncome: Bool = false
    var amountInput: String = ""
    var title: String = ""
    var note: String = ""
    var categoryId: String?
    var subcategoryId: String?
    var error: String?
}

private struct BusinessCategoryAllocDraft: Identifiable {
    let categoryId: String
    let categoryName: String
    var amountInput: String

    var id: String { categoryId }
}

private struct MomentSettingsDraft {
    var title: String = ""
    var targetAmountInput: String = ""
    var rhythmMonthly: Bool = true
    var startDateInput: String = ""
    var endDateInput: String = ""
    var description: String = ""
    var savingMode: String = ""
    var isPrivateMoment: Bool = true
    var groupStatus: String = "active"
    var sendPaymentReminders: Bool = true
    var autoNotifyOnContribution: Bool = true
    var allowPartialPayments: Bool = true
    var requireReceiptForExpenses: Bool = false
    var requireOrganiserApproval: Bool = false
    var budgetPeriod: String = ""
    var department: String = ""
    var approvalThresholdInput: String = ""
    var requireReceiptForAllExpenses: Bool = false
    var autoApproveBelowThreshold: Bool = true
    var managerApprovalRequired: Bool = true
    var notifyAdminOnSubmission: Bool = true
    var overBudgetAlertsPolicy: Bool = true
    var lockBudgetWhenLimitHit: Bool = false
    var weeklyDigest: Bool = true
    var pendingApprovalAlerts: Bool = true
    var overBudgetAlertsReminder: Bool = true
    var periodCloseReminder: Bool = true
    var categoryAllocations: [BusinessCategoryAllocDraft] = []
    var error: String?
}

struct ContextRouterView: View {
    @ObservedObject private var auth = AuthManager.shared
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        let theme = DesignTokens.theme(for: viewModel.selectedContext)
        let contextActionStyle = DesignTokens.actionStyle(
            context: viewModel.selectedContext,
            status: nil
        )
        let selectedActionStyle = DesignTokens.actionStyle(
            context: viewModel.selectedMoment?.context ?? viewModel.selectedContext,
            status: viewModel.selectedMoment?.status
        )
        ZStack(alignment: .top) {
            MomentraBase.bg.ignoresSafeArea()
            Rectangle()
                .fill(theme.headerGradient)
                .frame(height: DesignTokens.sizing.coverHeader)
                .frame(maxHeight: .infinity, alignment: .top)
            Circle()
                .fill(theme.accent.opacity(theme.orbOpacity))
                .frame(width: 300, height: 300)
                .offset(y: -80)

            ScrollView {
                VStack(spacing: 14) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Good \(timeOfDayLabel()), \(auth.currentUser?.name ?? "User")")
                                .font(DesignTokens.type.titleXL)
                                .foregroundColor(DesignTokens.base.onDark)
                            Text("Welcome back")
                                .font(DesignTokens.type.body)
                                .foregroundColor(DesignTokens.base.onDark60)
                        }
                        Spacer()
                        Button("Sign out") {
                            try? auth.signOut()
                        }
                        .font(DesignTokens.type.caption)
                        .foregroundColor(DesignTokens.base.onDark60)
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(MomentraContext.allCases, id: \.self) { context in
                                Button(context.displayName) {
                                    viewModel.selectedContext = context
                                }
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(viewModel.selectedContext == context ? theme.text : theme.tabDim)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(viewModel.selectedContext == context ? theme.accent : theme.tabBg)
                                .clipShape(Capsule())
                            }
                        }
                        .padding(6)
                        .background(DesignTokens.base.s100)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radius.card))
                    }

                    if viewModel.selectedContext == .business,
                       viewModel.selectedMoment == nil,
                       !viewModel.businessPendingInvites.isEmpty {
                        ForEach(viewModel.businessPendingInvites) { inv in
                            VStack(alignment: .leading, spacing: 8) {
                                Text("You're invited · \(inv.budgetName)")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(DesignTokens.base.onDark)
                                Text("Role: \(inv.role)")
                                    .font(.system(size: 12))
                                    .foregroundColor(DesignTokens.base.brandText)
                                HStack(spacing: 14) {
                                    Button("Accept invite") {
                                        Task { await viewModel.acceptBusinessInvite(inv, auth: auth) }
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(theme.accent)
                                    Button("Decline") {
                                        Task { await viewModel.declineBusinessInvite(inv, auth: auth) }
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(DesignTokens.base.onDark60)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .background(DesignTokens.base.s100)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }

                    if viewModel.selectedContext == .group,
                       viewModel.selectedMoment == nil,
                       !viewModel.groupPendingInvites.isEmpty {
                        ForEach(viewModel.groupPendingInvites) { inv in
                            VStack(alignment: .leading, spacing: 8) {
                                Text("You're invited · \(inv.momentTitle)")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(DesignTokens.base.onDark)
                                HStack(spacing: 14) {
                                    Button("Accept invite") {
                                        Task { await viewModel.acceptGroupInvite(inv, auth: auth) }
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(theme.accent)
                                    Button("Decline") {
                                        Task { await viewModel.declineGroupInvite(inv, auth: auth) }
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(DesignTokens.base.onDark60)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .background(DesignTokens.base.s100)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }

                    if viewModel.selectedMoment == nil,
                       viewModel.selectedContext == .business || viewModel.selectedContext == .group {
                        Button {
                            viewModel.showInviteQrScanner = true
                        } label: {
                            Text("Scan invite QR")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(theme.accent)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 4)
                    }

                    if let selected = viewModel.selectedMoment {
                        MomentDetailCardView(
                            title: viewModel.detailTitle.isEmpty ? selected.title : viewModel.detailTitle,
                            isLoading: viewModel.detailLoading,
                            error: viewModel.detailError,
                            lines: viewModel.detailLines,
                            recentTransactions: viewModel.detailTransactions,
                            isPersonal: selected.context == .personal,
                            isBusiness: selected.context == .business,
                            businessVendorBalances: viewModel.businessMomentDetail?.vendorBalances ?? [],
                            accent: selectedActionStyle.solid,
                            onBack: { viewModel.selectedMoment = nil },
                            onOpenSettings: { viewModel.openMomentSettings() },
                            onBusinessInviteShare: selected.context == .business && viewModel.businessCanInviteMembers
                                ? { viewModel.openBusinessInviteSheet() }
                                : nil,
                            onAddBusinessExpense: selected.context == .business
                                ? { viewModel.openBusinessExpenseSheet(kind: "expense") }
                                : nil,
                            onAddBusinessPurchase: selected.context == .business
                                ? { viewModel.openBusinessExpenseSheet(kind: "purchase") }
                                : nil
                        )
                    } else if viewModel.isLoading {
                        ProgressView()
                            .tint(theme.accent)
                            .padding(.top, 24)
                    } else if let errorMessage = viewModel.errorMessage {
                        EmptyStateCardView(
                            title: "Could not load \(viewModel.selectedContext.displayName) moments",
                            subtitle: errorMessage,
                            cta: "Try again",
                            templates: homeEmptyTemplates(for: viewModel.selectedContext),
                                accent: contextActionStyle.gradientStart,
                                accentEnd: contextActionStyle.gradientEnd,
                            onPrimaryCta: { Task { await viewModel.load(auth: auth) } },
                            onTemplateRow: { row in
                                switch row {
                                case .withPreset(let preset):
                                    viewModel.openCreateMomentSheet(preset: preset)
                                case .withBusinessPreset(let preset):
                                    viewModel.openCreateBusinessMomentSheet(preset: preset)
                                case .simple:
                                    break
                                }
                            }
                        )
                    } else {
                        let items = viewModel.itemsForSelectedContext()
                        if viewModel.selectedContext == .circle {
                            EmptyStateCardView(
                                title: "Circle is coming soon",
                                subtitle: "This space is being prepared for social discovery moments.",
                                cta: "Stay tuned",
                                templates: homeEmptyTemplates(for: .circle),
                                accent: contextActionStyle.gradientStart,
                                accentEnd: contextActionStyle.gradientEnd,
                                onPrimaryCta: {},
                                onTemplateRow: { _ in }
                            )
                        } else if items.isEmpty {
                            let subtitle = "No active moments found yet."
                            EmptyStateCardView(
                                title: "Create your first \(viewModel.selectedContext.displayName.lowercased()) moment",
                                subtitle: subtitle,
                                cta: "Use a starter plan",
                                templates: homeEmptyTemplates(for: viewModel.selectedContext),
                                accent: contextActionStyle.gradientStart,
                                accentEnd: contextActionStyle.gradientEnd,
                                onPrimaryCta: {
                                    if viewModel.selectedContext == .personal {
                                        viewModel.openCreateMomentSheet(preset: nil)
                                    } else if viewModel.selectedContext == .business {
                                        viewModel.openCreateBusinessMomentSheet(preset: nil)
                                    }
                                },
                                onTemplateRow: { row in
                                    switch row {
                                    case .withPreset(let preset):
                                        viewModel.openCreateMomentSheet(preset: preset)
                                    case .withBusinessPreset(let preset):
                                        viewModel.openCreateBusinessMomentSheet(preset: preset)
                                    case .simple:
                                        break
                                    }
                                }
                            )
                        } else {
                            VStack(spacing: 10) {
                                ForEach(items) { item in
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(theme.surface)
                                        .frame(maxWidth: .infinity, minHeight: 52)
                                        .overlay(
                                            VStack(alignment: .leading, spacing: 4) {
                                                Text(item.title)
                                                    .foregroundColor(DesignTokens.base.onDark)
                                                    .font(.system(size: 15, weight: .semibold))
                                                if item.context == .personal, let dt = item.durationType {
                                                    Text(personalRhythmLabel(dt, endDate: item.endDate))
                                                        .font(.system(size: 11, weight: .medium))
                                                        .foregroundColor(DesignTokens.base.onDark40)
                                                }
                                            }
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 10)
                                        )
                                        .onTapGesture {
                                            viewModel.selectedMoment = item
                                        }
                                }
                            }
                            .padding(.top, 2)
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.spacing.screenH)
                .padding(.vertical, 12)
            }

            if viewModel.selectedContext == .personal && viewModel.selectedMoment == nil {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            viewModel.openCreateMomentSheet(preset: nil)
                        } label: {
                            Text("New goal")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(contextActionStyle.text)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(contextActionStyle.solid)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 18)
                }
            } else if viewModel.selectedContext == .business && viewModel.selectedMoment == nil {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            viewModel.openCreateBusinessMomentSheet(preset: nil)
                        } label: {
                            Text("New budget")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(contextActionStyle.text)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(contextActionStyle.solid)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 18)
                }
            } else if viewModel.selectedMoment?.context == .personal {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            viewModel.openTransactionSheet()
                        } label: {
                            Text("Add to My Fund")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(selectedActionStyle.text)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(selectedActionStyle.solid)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 18)
                }
            } else if viewModel.selectedMoment?.context == .business {
                VStack {
                    Spacer()
                    VStack(alignment: .trailing, spacing: 8) {
                        if viewModel.businessCanInviteMembers {
                            Button {
                                viewModel.openBusinessInviteSheet()
                            } label: {
                                Text("Invite team")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(selectedActionStyle.text)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 12)
                                    .background(selectedActionStyle.solid)
                                    .clipShape(Capsule())
                            }
                        }
                        Button {
                            viewModel.openBusinessExpenseSheet(kind: "expense")
                        } label: {
                            Text("Add expense")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(selectedActionStyle.text)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(selectedActionStyle.solid)
                                .clipShape(Capsule())
                        }
                        Button {
                            viewModel.openBusinessExpenseSheet(kind: "purchase")
                        } label: {
                            Text("Add purchase")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(selectedActionStyle.text)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(selectedActionStyle.solidAlt)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 18)
                }
            }
        }
        .onOpenURL { url in
            Task { await viewModel.handleInviteUrl(url, auth: auth) }
        }
        .alert("Momentra", isPresented: Binding(
            get: { viewModel.joinToast != nil },
            set: { if !$0 { viewModel.joinToast = nil } }
        )) {
            Button("OK", role: .cancel) { viewModel.joinToast = nil }
        } message: {
            Text(viewModel.joinToast ?? "")
        }
        .task {
            await viewModel.load(auth: auth)
        }
        .onChange(of: viewModel.selectedContext) { _ in
            viewModel.selectedMoment = nil
            viewModel.showMomentSettingsSheet = false
            viewModel.showDeleteMomentAlert = false
            Task { await viewModel.load(auth: auth) }
        }
        .onChange(of: viewModel.selectedMoment) { _ in
            Task { await viewModel.loadDetail(auth: auth) }
        }
        .sheet(isPresented: $viewModel.showCreateMomentSheet) {
            PersonalCreateMomentView(
                preset: viewModel.createMomentPreset,
                sheetId: viewModel.createMomentSheetKey,
                isSubmitting: viewModel.createMomentSubmitting,
                onCancel: {
                    if !viewModel.createMomentSubmitting {
                        viewModel.showCreateMomentSheet = false
                        viewModel.createMomentPreset = nil
                    }
                },
                onCreate: { body in
                    Task { await viewModel.submitCreatePersonalMoment(auth: auth, body: body) }
                }
            )
            .presentationDetents([.medium, .large])
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $viewModel.showCreateBusinessMomentSheet) {
            BusinessCreateMomentView(
                preset: viewModel.createBusinessPreset,
                sheetId: viewModel.createBusinessSheetKey,
                isSubmitting: viewModel.createBusinessSubmitting,
                onCancel: {
                    if !viewModel.createBusinessSubmitting {
                        viewModel.showCreateBusinessMomentSheet = false
                        viewModel.createBusinessPreset = nil
                    }
                },
                onCreate: { body in
                    Task { await viewModel.submitCreateBusinessMoment(auth: auth, body: body) }
                }
            )
            .presentationDetents([.medium, .large])
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $viewModel.showTransactionSheet) {
            PersonalTransactionSheetView(
                draft: $viewModel.txnDraft,
                categories: viewModel.personalCategories,
                saving: viewModel.txnSaving,
                onCancel: { viewModel.showTransactionSheet = false },
                onSave: {
                    Task { await viewModel.saveTransaction(auth: auth) }
                }
            )
            .presentationDetents([.medium, .large])
            .preferredColorScheme(.dark)
            .task {
                await viewModel.loadPersonalCategories(auth: auth)
            }
            .onChange(of: viewModel.txnDraft.isIncome) { _ in
                Task { await viewModel.loadPersonalCategories(auth: auth) }
            }
        }
        .sheet(isPresented: $viewModel.showMomentSettingsSheet) {
            MomentSettingsSheetView(
                context: viewModel.selectedMoment?.context ?? .personal,
                draft: $viewModel.momentSettingsDraft,
                saving: viewModel.momentSettingsSaving,
                onCancel: { viewModel.showMomentSettingsSheet = false },
                onSave: {
                    Task { await viewModel.saveMomentSettings(auth: auth) }
                },
                onDelete: { viewModel.showDeleteMomentAlert = true }
            )
            .presentationDetents([.medium, .large])
            .preferredColorScheme(.dark)
        }
        .alert("Delete moment", isPresented: $viewModel.showDeleteMomentAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await viewModel.deleteSelectedMoment(auth: auth) }
            }
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $viewModel.showBusinessInviteSheet) {
            BusinessInviteSheetView(
                joinUrl: viewModel.businessShareJoinUrl,
                sheetKey: viewModel.businessInviteSheetKey,
                isSending: viewModel.businessEmailSending,
                resultMessage: viewModel.businessEmailResultMessage,
                accent: DesignTokens.theme(for: .business).accent,
                onDismiss: {
                    if !viewModel.businessEmailSending {
                        viewModel.showBusinessInviteSheet = false
                        viewModel.businessEmailResultMessage = nil
                        viewModel.businessShareJoinUrl = ""
                    }
                },
                onSendEmail: { email, message in
                    Task { await viewModel.sendBusinessInviteEmail(auth: auth, email: email, message: message) }
                },
                onRefreshLink: {
                    Task { await viewModel.refreshBusinessInviteLink(auth: auth) }
                }
            )
            .presentationDetents([.medium, .large])
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $viewModel.showBusinessExpenseSheet) {
            BusinessExpenseSheetView(
                categories: viewModel.businessMomentDetail?.categories ?? [],
                catalog: viewModel.businessCatalog,
                vendorOptions: viewModel.businessVendorNameOptions(),
                defaultKind: viewModel.businessExpenseDefaultKind,
                sheetKey: viewModel.businessExpenseSheetKey,
                accent: DesignTokens.theme(for: .business).accent,
                isSubmitting: viewModel.businessExpenseSubmitting,
                onCancel: {
                    if !viewModel.businessExpenseSubmitting {
                        viewModel.showBusinessExpenseSheet = false
                    }
                },
                onSubmit: { body in
                    Task { await viewModel.submitBusinessExpense(auth: auth, body: body) }
                }
            )
            .presentationDetents([.medium, .large])
            .interactiveDismissDisabled(viewModel.businessExpenseSubmitting)
        }
        .fullScreenCover(isPresented: $viewModel.showInviteQrScanner) {
            InviteQrScannerView(
                onCode: { raw in
                    Task { await viewModel.handleScannedInvite(raw, auth: auth) }
                },
                onCancel: { viewModel.showInviteQrScanner = false }
            )
            .ignoresSafeArea()
        }
        .momentraContext(viewModel.selectedContext)
        .preferredColorScheme(.dark)
    }
}

private struct MomentDetailCardView: View {
    let title: String
    let isLoading: Bool
    let error: String?
    let lines: [(String, String)]
    let recentTransactions: [PersonalTransactionOut]
    let isPersonal: Bool
    let isBusiness: Bool
    let businessVendorBalances: [BusinessVendorBalanceOut]
    let accent: Color
    let onBack: () -> Void
    let onOpenSettings: () -> Void
    var onBusinessInviteShare: (() -> Void)? = nil
    var onAddBusinessExpense: (() -> Void)? = nil
    var onAddBusinessPurchase: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button("Back", action: onBack)
                .foregroundColor(accent)
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(DesignTokens.base.onDark)
            if isLoading {
                ProgressView()
                    .tint(accent)
                    .padding(.top, 6)
            } else if let error {
                Text(error)
                    .font(.system(size: 13))
                    .foregroundColor(DesignTokens.base.brandText)
                    .padding(.top, 6)
            } else {
                ForEach(lines.indices, id: \.self) { idx in
                    let row = lines[idx]
                    HStack {
                        Text(row.0)
                            .font(.system(size: 13))
                            .foregroundColor(DesignTokens.base.brandText)
                        Spacer()
                        Text(row.1)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(DesignTokens.base.onDark)
                    }
                }
                if isBusiness, !businessVendorBalances.isEmpty {
                    Text("Vendor outstanding")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(DesignTokens.base.onDark)
                        .padding(.top, 8)
                    ForEach(businessVendorBalances.indices, id: \.self) { i in
                        let row = businessVendorBalances[i]
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.vendorName)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(DesignTokens.base.onDark)
                            Text(
                                "Total \(DesignTokens.formatInr(row.totalAmount)) · Paid \(DesignTokens.formatInr(row.paidAmount)) · Due \(DesignTokens.formatInr(row.balanceAmount))"
                            )
                            .font(.system(size: 11))
                            .foregroundColor(DesignTokens.base.brandText)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(DesignTokens.base.s200)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                if isBusiness, (onAddBusinessExpense != nil || onAddBusinessPurchase != nil || onBusinessInviteShare != nil) {
                    HStack(spacing: 4) {
                        if let onAddBusinessExpense {
                            Button("Add expense", action: onAddBusinessExpense)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(accent)
                        }
                        if let onAddBusinessPurchase {
                            Button("Add purchase", action: onAddBusinessPurchase)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(accent)
                        }
                        if let onBusinessInviteShare {
                            Button("Invite team", action: onBusinessInviteShare)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(accent)
                        }
                    }
                    .padding(.top, 6)
                }
                Button("Moment settings", action: onOpenSettings)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(accent)
                    .padding(.top, 6)
                if isPersonal {
                    Text("Recent transactions")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(DesignTokens.base.onDark)
                        .padding(.top, 8)
                    if recentTransactions.isEmpty {
                        Text("No recent transactions yet.")
                            .font(.system(size: 12))
                            .foregroundColor(DesignTokens.base.brandText)
                    } else {
                        ForEach(recentTransactions) { txn in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(txn.title)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(DesignTokens.base.onDark)
                                    Text(txn.subtitle)
                                        .font(.system(size: 11))
                                        .foregroundColor(DesignTokens.base.brandText)
                                }
                                Spacer()
                                Text(DesignTokens.formatInr(txn.isIncome ? txn.amount : -txn.amount))
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(txn.isIncome ? DesignTokens.group.accentEnd : DesignTokens.urgency.high)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(DesignTokens.base.s200)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(DesignTokens.base.s100)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct PersonalTransactionSheetView: View {
    @Binding var draft: PersonalTxnDraft
    let categories: [PersonalCategoryOut]
    let saving: Bool
    let onCancel: () -> Void
    let onSave: () -> Void

    private var selectedCategory: PersonalCategoryOut? {
        categories.first(where: { $0.categoryId == draft.categoryId })
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Type", selection: $draft.isIncome) {
                    Text("Expense").tag(false)
                    Text("Income").tag(true)
                }
                .pickerStyle(.segmented)

                TextField("Amount", text: $draft.amountInput)
                    .keyboardType(.decimalPad)

                Picker("Category", selection: Binding(
                    get: { draft.categoryId ?? "" },
                    set: { newValue in
                        draft.categoryId = newValue.isEmpty ? nil : newValue
                        let picked = categories.first(where: { $0.categoryId == newValue })
                        draft.subcategoryId = picked?.subcategories.first?.subcategoryId
                    }
                )) {
                    ForEach(categories) { category in
                        Text(category.name).tag(category.categoryId)
                    }
                }

                Picker("Subcategory", selection: Binding(
                    get: { draft.subcategoryId ?? "" },
                    set: { draft.subcategoryId = $0.isEmpty ? nil : $0 }
                )) {
                    ForEach(selectedCategory?.subcategories ?? []) { sub in
                        Text(sub.name).tag(sub.subcategoryId)
                    }
                }

                TextField("Title (optional)", text: $draft.title)
                TextField("Note (optional)", text: $draft.note)

                if let error = draft.error, !error.isEmpty {
                    Text(error).foregroundColor(DesignTokens.urgency.high)
                }
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.base.bg)
            .navigationTitle("Add transaction")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if saving {
                        ProgressView()
                    } else {
                        Button("Save", action: onSave)
                    }
                }
            }
        }
    }
}

private struct MomentSettingsSheetView: View {
    let context: MomentraContext
    @Binding var draft: MomentSettingsDraft
    let saving: Bool
    let onCancel: () -> Void
    let onSave: () -> Void
    let onDelete: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                switch context {
                case .personal:
                    TextField("Title", text: $draft.title)
                    TextField("Target amount", text: $draft.targetAmountInput)
                        .keyboardType(.decimalPad)
                    Picker("Rhythm", selection: $draft.rhythmMonthly) {
                        Text("Monthly").tag(true)
                        Text("Ends on date").tag(false)
                    }
                    .pickerStyle(.segmented)
                    TextField("Start date (YYYY-MM-DD)", text: $draft.startDateInput)
                    if !draft.rhythmMonthly {
                        TextField("End date (YYYY-MM-DD)", text: $draft.endDateInput)
                    }
                    TextField("Saving mode", text: $draft.savingMode)
                    TextField("Description", text: $draft.description, axis: .vertical)
                        .lineLimit(2...4)
                    Toggle("Private moment", isOn: $draft.isPrivateMoment)
                case .group:
                    TextField("Title", text: $draft.title)
                    TextField("Target amount", text: $draft.targetAmountInput)
                        .keyboardType(.decimalPad)
                    TextField("Destination", text: $draft.description)
                    TextField("Contribution due date (YYYY-MM-DD)", text: $draft.endDateInput)
                    TextField("Status (active/completed/archived)", text: $draft.groupStatus)
                    Toggle("Send payment reminders", isOn: $draft.sendPaymentReminders)
                    Toggle("Auto notify on contribution", isOn: $draft.autoNotifyOnContribution)
                    Toggle("Allow partial payments", isOn: $draft.allowPartialPayments)
                    Toggle("Require receipt for expenses", isOn: $draft.requireReceiptForExpenses)
                    Toggle("Require organiser approval", isOn: $draft.requireOrganiserApproval)
                case .business:
                    TextField("Budget name", text: $draft.title)
                    TextField("Total budget", text: $draft.targetAmountInput)
                        .keyboardType(.decimalPad)
                    TextField("Budget period", text: $draft.budgetPeriod)
                    TextField("Department", text: $draft.department)
                    TextField("Approval threshold", text: $draft.approvalThresholdInput)
                        .keyboardType(.decimalPad)
                    Toggle("Require receipt for all expenses", isOn: $draft.requireReceiptForAllExpenses)
                    Toggle("Auto approve below threshold", isOn: $draft.autoApproveBelowThreshold)
                    Toggle("Manager approval required", isOn: $draft.managerApprovalRequired)
                    Toggle("Notify admin on submission", isOn: $draft.notifyAdminOnSubmission)
                    Toggle("Over budget receipts (policy)", isOn: $draft.overBudgetAlertsPolicy)
                    Toggle("Lock budget when limit hit", isOn: $draft.lockBudgetWhenLimitHit)
                    Toggle("Weekly digest", isOn: $draft.weeklyDigest)
                    Toggle("Pending approval receipts", isOn: $draft.pendingApprovalAlerts)
                    Toggle("Over budget receipts (reminder)", isOn: $draft.overBudgetAlertsReminder)
                    Toggle("Period close receipts reminder", isOn: $draft.periodCloseReminder)
                    if !draft.categoryAllocations.isEmpty {
                        Section("Category allocations") {
                            ForEach(draft.categoryAllocations.indices, id: \.self) { idx in
                                TextField(
                                    "\(draft.categoryAllocations[idx].categoryName) allocation",
                                    text: Binding(
                                        get: { draft.categoryAllocations[idx].amountInput },
                                        set: { draft.categoryAllocations[idx].amountInput = $0 }
                                    )
                                )
                                .keyboardType(.decimalPad)
                            }
                        }
                    }
                case .circle:
                    EmptyView()
                }

                if let error = draft.error, !error.isEmpty {
                    Text(error).foregroundColor(DesignTokens.urgency.high)
                }

                Button("Delete moment", role: .destructive, action: onDelete)
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.base.bg)
            .navigationTitle(context == .business ? "Business settings" : (context == .group ? "Group settings" : "Moment settings"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if saving {
                        ProgressView()
                    } else {
                        Button("Save", action: onSave)
                    }
                }
            }
        }
    }
}

private struct EmptyStateCardView: View {
    let title: String
    let subtitle: String
    let cta: String
    let templates: [HomeEmptyTemplate]
    let accent: Color
    let accentEnd: Color
    let onPrimaryCta: () -> Void
    let onTemplateRow: (HomeEmptyTemplate) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(DesignTokens.base.onDark)
            Text(subtitle)
                .font(.system(size: 13))
                .foregroundColor(DesignTokens.base.brandText)
            Button(action: onPrimaryCta) {
                Text(cta)
                    .font(.system(size: 14, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .foregroundColor(DesignTokens.semantic.ctaText)
            .background(
                LinearGradient(colors: [accent, accentEnd], startPoint: .leading, endPoint: .trailing)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Text("Starter plans")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(DesignTokens.base.onDark)
                .padding(.top, 4)
            ForEach(Array(templates.enumerated()), id: \.offset) { _, template in
                switch template {
                case .simple(let label):
                    Button {
                        onTemplateRow(template)
                    } label: {
                        HStack {
                            Text(label)
                                .foregroundColor(DesignTokens.base.onDark)
                                .font(.system(size: 13))
                            Spacer()
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .background(DesignTokens.base.s200)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                case .withPreset(let preset):
                    Button {
                        onTemplateRow(template)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(preset.title)
                                .foregroundColor(DesignTokens.base.onDark)
                                .font(.system(size: 13, weight: .semibold))
                            Text(preset.subtitle)
                                .foregroundColor(DesignTokens.base.onDark40)
                                .font(.system(size: 12))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(DesignTokens.base.s200)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                case .withBusinessPreset(let preset):
                    Button {
                        onTemplateRow(template)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(preset.budgetName)
                                .foregroundColor(DesignTokens.base.onDark)
                                .font(.system(size: 13, weight: .semibold))
                            Text(preset.subtitle)
                                .foregroundColor(DesignTokens.base.onDark40)
                                .font(.system(size: 12))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(DesignTokens.base.s200)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(16)
        .background(DesignTokens.base.s100)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

@MainActor
private final class HomeViewModel: ObservableObject {
    @Published var selectedContext: MomentraContext = .personal
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var personalNetBalance: Double = 0
    @Published var personalItems: [HomeListItem] = []
    @Published var groupItems: [HomeListItem] = []
    @Published var businessItems: [HomeListItem] = []
    @Published var selectedMoment: HomeListItem?
    @Published var detailLoading = false
    @Published var detailError: String?
    @Published var detailTitle = ""
    @Published var detailLines: [(String, String)] = []
    @Published var detailTransactions: [PersonalTransactionOut] = []
    @Published var personalCategories: [PersonalCategoryOut] = []
    @Published var showTransactionSheet = false
    @Published var txnDraft = PersonalTxnDraft()
    @Published var txnSaving = false
    @Published var showMomentSettingsSheet = false
    @Published var showDeleteMomentAlert = false
    @Published var momentSettingsDraft = MomentSettingsDraft()
    @Published var momentSettingsSaving = false
    @Published var showCreateMomentSheet = false
    @Published var createMomentPreset: PersonalQuickTemplate?
    @Published var createMomentSheetKey = 0
    @Published var createMomentSubmitting = false
    @Published var showCreateBusinessMomentSheet = false
    @Published var createBusinessPreset: BusinessQuickTemplate?
    @Published var createBusinessSheetKey = 0
    @Published var createBusinessSubmitting = false
    @Published var businessPendingInvites: [BusinessPendingInviteOut] = []
    @Published var groupPendingInvites: [GroupPendingInviteOut] = []
    @Published var showBusinessInviteSheet = false
    @Published var businessInviteSheetKey = 0
    @Published var businessShareJoinUrl = ""
    @Published var businessEmailSending = false
    @Published var businessEmailResultMessage: String?
    @Published var showInviteQrScanner = false
    @Published var joinToast: String?
    @Published var businessMomentDetail: BusinessBudgetCreateOut?
    @Published var businessCatalog: BusinessCatalogOut?
    @Published var businessCanInviteMembers = false
    @Published var showBusinessExpenseSheet = false
    @Published var businessExpenseSheetKey = 0
    @Published var businessExpenseDefaultKind = "expense"
    @Published var businessExpenseSubmitting = false

    private func toHomeListItem(_ moment: PersonalMomentItemOut) -> HomeListItem {
        HomeListItem(
            id: moment.momentId,
            title: moment.title,
            context: .personal,
            type: moment.momentType,
            status: moment.status,
            targetAmount: moment.targetAmount,
            durationType: moment.durationType,
            startDate: moment.startDate,
            endDate: moment.endDate,
            description: moment.description,
            savingMode: moment.savingMode,
            isPrivateMoment: moment.isPrivateMoment ?? true
        )
    }

    private func toHomeListItem(_ moment: GroupMomentOut) -> HomeListItem {
        HomeListItem(
            id: moment.momentId,
            title: moment.title,
            context: .group,
            type: moment.momentType,
            status: moment.status,
            targetAmount: moment.targetAmount ?? moment.raisedAmount,
            durationType: nil,
            startDate: nil,
            endDate: moment.contributionDueDate,
            description: moment.destination,
            savingMode: nil,
            isPrivateMoment: false
        )
    }

    private func toHomeListItem(_ budget: BusinessBudgetCreateOut) -> HomeListItem {
        HomeListItem(
            id: budget.budgetId,
            title: budget.budgetName,
            context: .business,
            type: budget.budgetType,
            status: budget.status,
            targetAmount: budget.totalBudget,
            durationType: nil,
            startDate: nil,
            endDate: nil,
            description: budget.department,
            savingMode: budget.budgetPeriod,
            isPrivateMoment: false
        )
    }

    func load(auth: AuthManager) async {
        if selectedContext == .circle {
            isLoading = false
            errorMessage = nil
            return
        }
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            errorMessage = "Unauthorized session"
            isLoading = false
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            switch selectedContext {
            case .personal:
                let home: PersonalHomeOut = try await NetworkService.shared.request(endpoint: "/personal/home", token: token)
                let moments: PersonalMomentListResponse = try await NetworkService.shared.request(endpoint: "/personal/moments", token: token)
                personalNetBalance = home.netBalance
                personalItems = moments.moments.map { toHomeListItem($0) }
            case .group:
                let group: GroupMomentListOut = try await NetworkService.shared.request(endpoint: "/group/moments", token: token)
                groupItems = group.moments.map { toHomeListItem($0) }
                let pending = try await NetworkService.shared.groupPendingInvites(token: token)
                groupPendingInvites = pending.invites
            case .business:
                let business: BusinessBudgetListOut = try await NetworkService.shared.request(endpoint: "/business/moments", token: token)
                businessItems = business.budgets.map { toHomeListItem($0) }
                let pending = try await NetworkService.shared.businessPendingInvites(token: token)
                businessPendingInvites = pending.invites
            case .circle:
                break
            }
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    func itemsForSelectedContext() -> [HomeListItem] {
        switch selectedContext {
        case .personal:
            return personalItems
        case .group:
            return groupItems
        case .business:
            return businessItems
        case .circle:
            return []
        }
    }

    func loadDetail(auth: AuthManager) async {
        guard let selectedMoment else {
            detailLoading = false
            detailError = nil
            detailTitle = ""
            detailLines = []
            detailTransactions = []
            businessMomentDetail = nil
            businessCatalog = nil
            businessCanInviteMembers = false
            return
        }
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            detailLoading = false
            detailError = "Unauthorized session"
            businessMomentDetail = nil
            businessCatalog = nil
            businessCanInviteMembers = false
            return
        }
        detailLoading = true
        detailError = nil
        detailTitle = selectedMoment.title
        switch selectedMoment.context {
        case .personal:
            businessMomentDetail = nil
            businessCatalog = nil
            businessCanInviteMembers = false
            do {
                let txns: PersonalTransactionListOut = try await NetworkService.shared.request(
                    endpoint: "/personal/transactions?kind=all&limit=8",
                    token: token
                )
                detailLoading = false
                detailLines = [
                    ("Context", "Personal"),
                    ("Type", selectedMoment.type ?? "N/A"),
                    ("Rhythm", personalRhythmLabel(selectedMoment.durationType ?? "", endDate: selectedMoment.endDate)),
                    ("Status", selectedMoment.status ?? "N/A"),
                    ("Target", DesignTokens.formatInr(selectedMoment.targetAmount ?? 0)),
                    ("Start date", selectedMoment.startDate ?? "N/A"),
                    ("End date", selectedMoment.endDate ?? "N/A"),
                    ("Saving mode", selectedMoment.savingMode ?? "N/A"),
                    ("Privacy", selectedMoment.isPrivateMoment ? "Private" : "Shared")
                ]
                detailTransactions = txns.transactions
            } catch {
                detailLoading = false
                detailError = error.localizedDescription
            }
        case .group:
            businessMomentDetail = nil
            businessCatalog = nil
            businessCanInviteMembers = false
            do {
                let detail: GroupMomentDetailOut = try await NetworkService.shared.request(
                    endpoint: "/group/moments/\(selectedMoment.id)",
                    token: token
                )
                detailLoading = false
                detailTitle = detail.moment.title
                detailLines = [
                    ("Context", "Group"),
                    ("Type", detail.moment.momentType ?? "N/A"),
                    ("Status", detail.moment.status ?? "N/A"),
                    ("Target", DesignTokens.formatInr(detail.moment.targetAmount ?? 0)),
                    ("Raised", DesignTokens.formatInr(detail.moment.raisedAmount ?? 0)),
                    ("Destination", detail.moment.destination ?? "N/A"),
                    ("Contribution due", detail.moment.contributionDueDate ?? "N/A")
                ]
            } catch {
                detailLoading = false
                detailError = error.localizedDescription
            }
        case .business:
            do {
                let detail: BusinessBudgetCreateOut = try await NetworkService.shared.request(
                    endpoint: "/business/moments/\(selectedMoment.id)",
                    token: token
                )
                await refreshBusinessCatalog(token: token, budgetId: selectedMoment.id)
                detailLoading = false
                businessMomentDetail = detail
                refreshBusinessInviteCapability(auth: auth)
                detailTitle = detail.budgetName
                detailLines = [
                    ("Context", "Business"),
                    ("Type", detail.budgetType ?? "N/A"),
                    ("Status", detail.status ?? "N/A"),
                    ("Budget period", detail.budgetPeriod ?? "N/A"),
                    ("Department", detail.department ?? "N/A"),
                    ("Approval threshold", DesignTokens.formatInr(detail.approvalThreshold ?? 0)),
                    ("Total Budget", DesignTokens.formatInr(detail.totalBudget ?? 0)),
                    ("Spent", DesignTokens.formatInr(detail.spentAmount ?? 0))
                ]
            } catch {
                detailLoading = false
                detailError = error.localizedDescription
                businessMomentDetail = nil
                businessCatalog = nil
                businessCanInviteMembers = false
            }
        case .circle:
            businessMomentDetail = nil
            businessCatalog = nil
            businessCanInviteMembers = false
            detailLoading = false
            detailLines = [("Context", "Circle"), ("Status", "Coming soon")]
        }
    }

    private func refreshBusinessInviteCapability(auth: AuthManager) {
        guard let detail = businessMomentDetail else {
            businessCanInviteMembers = false
            return
        }
        let uid = auth.firebaseUid ?? auth.meProfile?.uid
        let inviteRoles: Set<String> = ["owner", "admin", "manager", "finance"]
        guard let uid else {
            businessCanInviteMembers = false
            return
        }
        let members = detail.teamMembers ?? []
        let mine = members.first { $0.firebaseUid == uid }
        let role = mine?.role.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        businessCanInviteMembers = inviteRoles.contains(role)
    }

    private func refreshBusinessCatalog(token: String, budgetId: String) async {
        do {
            businessCatalog = try await NetworkService.shared.businessBudgetCatalog(budgetId: budgetId, token: token)
        } catch {
            businessCatalog = nil
        }
    }

    func businessVendorNameOptions() -> [String] {
        guard let d = businessMomentDetail else { return [] }
        let fromV = (d.vendors ?? []).map(\.vendorName)
        let fromB = (d.vendorBalances ?? []).map(\.vendorName)
        let merged = (fromV + fromB)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return Array(Set(merged)).sorted()
    }

    func refreshPersonalMoments(auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            errorMessage = "Unauthorized session"
            return
        }
        do {
            let home: PersonalHomeOut = try await NetworkService.shared.request(endpoint: "/personal/home", token: token)
            let moments: PersonalMomentListResponse = try await NetworkService.shared.request(endpoint: "/personal/moments", token: token)
            personalNetBalance = home.netBalance
            personalItems = moments.moments.map { toHomeListItem($0) }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshGroupMoments(auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            errorMessage = "Unauthorized session"
            return
        }
        do {
            let groups: GroupMomentListOut = try await NetworkService.shared.request(endpoint: "/group/moments", token: token)
            groupItems = groups.moments.map { toHomeListItem($0) }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshBusinessMoments(auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            errorMessage = "Unauthorized session"
            return
        }
        do {
            let budgets: BusinessBudgetListOut = try await NetworkService.shared.request(endpoint: "/business/moments", token: token)
            businessItems = budgets.budgets.map { toHomeListItem($0) }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func openMomentSettings() {
        guard let selectedMoment else { return }
        switch selectedMoment.context {
        case .personal:
            momentSettingsDraft = MomentSettingsDraft(
                title: selectedMoment.title,
                targetAmountInput: selectedMoment.targetAmount.map { String($0) } ?? "",
                rhythmMonthly: selectedMoment.durationType == PersonalMomentDuration.recurringMonthly,
                startDateInput: selectedMoment.startDate ?? "",
                endDateInput: selectedMoment.endDate ?? "",
                description: selectedMoment.description ?? "",
                savingMode: selectedMoment.savingMode ?? "",
                isPrivateMoment: selectedMoment.isPrivateMoment,
                error: nil
            )
            showMomentSettingsSheet = true
        case .group:
            Task {
                guard let token = AuthManager.shared.getAccessToken(), !token.isEmpty else {
                    self.detailError = "Unauthorized session"
                    return
                }
                do {
                    let detail: GroupMomentDetailOut = try await NetworkService.shared.request(
                        endpoint: "/group/moments/\(selectedMoment.id)",
                        token: token
                    )
                    momentSettingsDraft = MomentSettingsDraft(
                        title: detail.moment.title,
                        targetAmountInput: detail.moment.targetAmount.map { String($0) } ?? "",
                        endDateInput: detail.moment.contributionDueDate ?? "",
                        description: detail.moment.destination ?? "",
                        groupStatus: detail.moment.status ?? "active",
                        sendPaymentReminders: detail.rules.sendPaymentReminders,
                        autoNotifyOnContribution: detail.rules.autoNotifyOnContribution,
                        allowPartialPayments: detail.rules.allowPartialPayments,
                        requireReceiptForExpenses: detail.rules.requireReceiptForExpenses,
                        requireOrganiserApproval: detail.rules.requireOrganiserApproval,
                        error: nil
                    )
                    showMomentSettingsSheet = true
                } catch {
                    detailError = error.localizedDescription
                }
            }
        case .business:
            Task {
                guard let token = AuthManager.shared.getAccessToken(), !token.isEmpty else {
                    self.detailError = "Unauthorized session"
                    return
                }
                do {
                    let detail: BusinessBudgetCreateOut = try await NetworkService.shared.request(
                        endpoint: "/business/moments/\(selectedMoment.id)",
                        token: token
                    )
                    await refreshBusinessCatalog(token: token, budgetId: selectedMoment.id)
                    businessMomentDetail = detail
                    refreshBusinessInviteCapability(auth: AuthManager.shared)
                    let allocations = detail.categories.map {
                        BusinessCategoryAllocDraft(categoryId: $0.categoryId, categoryName: $0.name, amountInput: String($0.allocatedAmount))
                    }
                    momentSettingsDraft = MomentSettingsDraft(
                        title: detail.budgetName,
                        targetAmountInput: detail.totalBudget.map { String($0) } ?? "",
                        budgetPeriod: detail.budgetPeriod ?? "",
                        department: detail.department ?? "",
                        approvalThresholdInput: detail.approvalThreshold.map { String($0) } ?? "",
                        weeklyDigest: detail.reminderPrefs?.weeklyDigest ?? true,
                        pendingApprovalAlerts: detail.reminderPrefs?.pendingApprovalAlerts ?? true,
                        overBudgetAlertsReminder: detail.reminderPrefs?.overBudgetAlerts ?? true,
                        periodCloseReminder: detail.reminderPrefs?.periodCloseReminder ?? true,
                        categoryAllocations: allocations,
                        error: nil
                    )
                    showMomentSettingsSheet = true
                } catch {
                    detailError = error.localizedDescription
                }
            }
        case .circle:
            return
        }
    }

    func saveMomentSettings(auth: AuthManager) async {
        guard let selectedMoment else { return }
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            momentSettingsDraft.error = "Unauthorized session"
            return
        }

        momentSettingsSaving = true
        momentSettingsDraft.error = nil
        do {
            switch selectedMoment.context {
            case .personal:
                if !momentSettingsDraft.targetAmountInput.isEmpty && Double(momentSettingsDraft.targetAmountInput) == nil {
                    momentSettingsSaving = false
                    momentSettingsDraft.error = "Target amount must be a valid number"
                    return
                }
                let body = PersonalMomentPatchIn(
                    title: momentSettingsDraft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.title,
                    targetAmount: Double(momentSettingsDraft.targetAmountInput),
                    durationType: momentSettingsDraft.rhythmMonthly ? PersonalMomentDuration.recurringMonthly : PersonalMomentDuration.fixedEnd,
                    startDate: momentSettingsDraft.startDateInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.startDateInput,
                    endDate: momentSettingsDraft.rhythmMonthly ? nil : (momentSettingsDraft.endDateInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.endDateInput),
                    description: momentSettingsDraft.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.description,
                    savingMode: momentSettingsDraft.savingMode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.savingMode,
                    isPrivateMoment: momentSettingsDraft.isPrivateMoment
                )
                let updated: PersonalMomentItemOut = try await NetworkService.shared.request(
                    endpoint: "/personal/moments/\(selectedMoment.id)",
                    method: "PATCH",
                    body: body,
                    token: token
                )
                let updatedItem = toHomeListItem(updated)
                if let index = personalItems.firstIndex(where: { $0.id == updatedItem.id }) {
                    personalItems[index] = updatedItem
                }
                self.selectedMoment = updatedItem
                await refreshPersonalMoments(auth: auth)
            case .group:
                if !momentSettingsDraft.targetAmountInput.isEmpty && Double(momentSettingsDraft.targetAmountInput) == nil {
                    momentSettingsSaving = false
                    momentSettingsDraft.error = "Target amount must be a valid number"
                    return
                }
                let body = GroupMomentPatchIn(
                    title: momentSettingsDraft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.title,
                    targetAmount: Double(momentSettingsDraft.targetAmountInput),
                    destination: momentSettingsDraft.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.description,
                    contributionDueDate: momentSettingsDraft.endDateInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.endDateInput,
                    rules: GroupMomentRulesIn(
                        sendPaymentReminders: momentSettingsDraft.sendPaymentReminders,
                        autoNotifyOnContribution: momentSettingsDraft.autoNotifyOnContribution,
                        allowPartialPayments: momentSettingsDraft.allowPartialPayments,
                        requireReceiptForExpenses: momentSettingsDraft.requireReceiptForExpenses,
                        requireOrganiserApproval: momentSettingsDraft.requireOrganiserApproval
                    ),
                    status: momentSettingsDraft.groupStatus.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.groupStatus
                )
                let updated: GroupMomentDetailOut = try await NetworkService.shared.request(
                    endpoint: "/group/moments/\(selectedMoment.id)",
                    method: "PATCH",
                    body: body,
                    token: token
                )
                let updatedItem = toHomeListItem(updated.moment)
                if let index = groupItems.firstIndex(where: { $0.id == updatedItem.id }) {
                    groupItems[index] = updatedItem
                }
                self.selectedMoment = updatedItem
                await refreshGroupMoments(auth: auth)
            case .business:
                if !momentSettingsDraft.targetAmountInput.isEmpty && Double(momentSettingsDraft.targetAmountInput) == nil {
                    momentSettingsSaving = false
                    momentSettingsDraft.error = "Total budget must be a valid number"
                    return
                }
                if !momentSettingsDraft.approvalThresholdInput.isEmpty && Double(momentSettingsDraft.approvalThresholdInput) == nil {
                    momentSettingsSaving = false
                    momentSettingsDraft.error = "Approval threshold must be a valid number"
                    return
                }
                var categoryPatches: [BusinessBudgetCategoryAllocPatchIn] = []
                for item in momentSettingsDraft.categoryAllocations {
                    guard let amount = Double(item.amountInput) else {
                        momentSettingsSaving = false
                        momentSettingsDraft.error = "All category allocations must be valid numbers"
                        return
                    }
                    categoryPatches.append(BusinessBudgetCategoryAllocPatchIn(categoryId: item.categoryId, allocatedAmount: amount))
                }
                let body = BusinessBudgetPatchIn(
                    budgetName: momentSettingsDraft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.title,
                    budgetPeriod: momentSettingsDraft.budgetPeriod.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.budgetPeriod,
                    totalBudget: Double(momentSettingsDraft.targetAmountInput),
                    department: momentSettingsDraft.department.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : momentSettingsDraft.department,
                    approvalThreshold: Double(momentSettingsDraft.approvalThresholdInput),
                    spendingPolicies: BusinessBudgetPoliciesIn(
                        requireReceiptForAllExpenses: momentSettingsDraft.requireReceiptForAllExpenses,
                        autoApproveBelowThreshold: momentSettingsDraft.autoApproveBelowThreshold,
                        managerApprovalRequired: momentSettingsDraft.managerApprovalRequired,
                        notifyAdminOnSubmission: momentSettingsDraft.notifyAdminOnSubmission,
                        overBudgetAlerts: momentSettingsDraft.overBudgetAlertsPolicy,
                        lockBudgetWhenLimitHit: momentSettingsDraft.lockBudgetWhenLimitHit
                    ),
                    reminderPrefs: BusinessBudgetReminderPrefsPatchIn(
                        weeklyDigest: momentSettingsDraft.weeklyDigest,
                        pendingApprovalAlerts: momentSettingsDraft.pendingApprovalAlerts,
                        overBudgetAlerts: momentSettingsDraft.overBudgetAlertsReminder,
                        periodCloseReminder: momentSettingsDraft.periodCloseReminder
                    ),
                    categories: categoryPatches
                )
                let updated: BusinessBudgetCreateOut = try await NetworkService.shared.request(
                    endpoint: "/business/budgets/\(selectedMoment.id)",
                    method: "PATCH",
                    body: body,
                    token: token
                )
                let updatedItem = toHomeListItem(updated)
                if let index = businessItems.firstIndex(where: { $0.id == updatedItem.id }) {
                    businessItems[index] = updatedItem
                }
                self.selectedMoment = updatedItem
                await refreshBusinessMoments(auth: auth)
            case .circle:
                break
            }
            await loadDetail(auth: auth)
            showMomentSettingsSheet = false
            momentSettingsSaving = false
        } catch {
            momentSettingsSaving = false
            momentSettingsDraft.error = error.localizedDescription
        }
    }

    func deleteSelectedMoment(auth: AuthManager) async {
        guard let selectedMoment else { return }
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            momentSettingsDraft.error = "Unauthorized session"
            return
        }
        momentSettingsSaving = true
        momentSettingsDraft.error = nil
        do {
            switch selectedMoment.context {
            case .personal:
                try await NetworkService.shared.requestNoContent(
                    endpoint: "/personal/moments/\(selectedMoment.id)",
                    method: "DELETE",
                    token: token
                )
                await refreshPersonalMoments(auth: auth)
            case .group:
                try await NetworkService.shared.requestNoContent(
                    endpoint: "/group/moments/\(selectedMoment.id)",
                    method: "DELETE",
                    token: token
                )
                await refreshGroupMoments(auth: auth)
            case .business:
                try await NetworkService.shared.requestNoContent(
                    endpoint: "/business/budgets/\(selectedMoment.id)",
                    method: "DELETE",
                    token: token
                )
                await refreshBusinessMoments(auth: auth)
            case .circle:
                break
            }
            self.selectedMoment = nil
            detailTitle = ""
            detailLines = []
            detailTransactions = []
            showDeleteMomentAlert = false
            showMomentSettingsSheet = false
            momentSettingsSaving = false
        } catch {
            showDeleteMomentAlert = false
            momentSettingsSaving = false
            momentSettingsDraft.error = error.localizedDescription
        }
    }

    func openTransactionSheet() {
        txnDraft = PersonalTxnDraft(isIncome: false)
        personalCategories = []
        showTransactionSheet = true
    }

    func openCreateMomentSheet(preset: PersonalQuickTemplate?) {
        createMomentPreset = preset
        createMomentSheetKey += 1
        showCreateMomentSheet = true
    }

    func openCreateBusinessMomentSheet(preset: BusinessQuickTemplate?) {
        createBusinessPreset = preset
        createBusinessSheetKey += 1
        showCreateBusinessMomentSheet = true
    }

    func submitCreatePersonalMoment(auth: AuthManager, body: PersonalMomentCreateIn) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            return
        }
        createMomentSubmitting = true
        do {
            let out: PersonalMomentCreateOut = try await NetworkService.shared.request(
                endpoint: "/personal/moments",
                method: "POST",
                body: body,
                token: token
            )
            createMomentSubmitting = false
            showCreateMomentSheet = false
            createMomentPreset = nil
            await refreshPersonalMoments(auth: auth)
            selectedMoment = personalItems.first(where: { $0.id == out.momentId })
        } catch {
            createMomentSubmitting = false
        }
    }

    func submitCreateBusinessMoment(auth: AuthManager, body: BusinessBudgetCreateIn) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            return
        }
        createBusinessSubmitting = true
        do {
            let out: BusinessBudgetCreateOut = try await NetworkService.shared.request(
                endpoint: "/business/moments",
                method: "POST",
                body: body,
                token: token
            )
            createBusinessSubmitting = false
            showCreateBusinessMomentSheet = false
            createBusinessPreset = nil
            await refreshBusinessMoments(auth: auth)
            selectedMoment = businessItems.first(where: { $0.id == out.budgetId })
        } catch {
            createBusinessSubmitting = false
        }
    }

    func loadPersonalCategories(auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            txnDraft.error = "Unauthorized session"
            return
        }
        let kind = txnDraft.isIncome ? "income" : "expense"
        do {
            let cats: PersonalCategoryListOut = try await NetworkService.shared.request(
                endpoint: "/personal/categories?kind=\(kind)",
                token: token
            )
            personalCategories = cats.categories
            let current = cats.categories.first(where: { $0.categoryId == txnDraft.categoryId })
            txnDraft.categoryId = current?.categoryId ?? cats.categories.first?.categoryId
            let subPool = (current ?? cats.categories.first)?.subcategories ?? []
            txnDraft.subcategoryId = subPool.first(where: { $0.subcategoryId == txnDraft.subcategoryId })?.subcategoryId
                ?? subPool.first?.subcategoryId
            txnDraft.error = nil
        } catch {
            txnDraft.error = error.localizedDescription
        }
    }

    func saveTransaction(auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            txnDraft.error = "Unauthorized session"
            return
        }
        if personalCategories.isEmpty {
            await loadPersonalCategories(auth: auth)
        }
        guard
            let amount = Double(txnDraft.amountInput),
            amount > 0,
            let category = personalCategories.first(where: { $0.categoryId == txnDraft.categoryId })
        else {
            txnDraft.error = "Select category and enter valid amount"
            return
        }
        txnSaving = true
        txnDraft.error = nil
        do {
            let body = PersonalTransactionCreateIn(
                isIncome: txnDraft.isIncome,
                amount: amount,
                category: category.name,
                subcategoryId: txnDraft.subcategoryId,
                subcategoryLabel: nil,
                accountId: nil,
                title: txnDraft.title.isEmpty ? nil : txnDraft.title,
                note: txnDraft.note.isEmpty ? nil : txnDraft.note
            )
            let _: PersonalTransactionOut = try await NetworkService.shared.request(
                endpoint: "/personal/transactions",
                method: "POST",
                body: body,
                token: token
            )
            txnSaving = false
            showTransactionSheet = false
            if selectedMoment != nil {
                await loadDetail(auth: auth)
            }
        } catch {
            txnSaving = false
            txnDraft.error = error.localizedDescription
        }
    }

    func openBusinessInviteSheet() {
        businessInviteSheetKey += 1
        businessShareJoinUrl = ""
        businessEmailResultMessage = nil
        showBusinessInviteSheet = true
        Task {
            await refreshBusinessInviteLink(auth: AuthManager.shared)
        }
    }

    func openBusinessExpenseSheet(kind: String) {
        businessExpenseDefaultKind = kind
        businessExpenseSheetKey += 1
        showBusinessExpenseSheet = true
    }

    func submitBusinessExpense(auth: AuthManager, body: BusinessExpenseCreateIn) async {
        guard let selectedMoment, selectedMoment.context == .business else { return }
        guard let token = auth.getAccessToken(), !token.isEmpty else {
            joinToast = "Unauthorized session"
            return
        }
        businessExpenseSubmitting = true
        defer { businessExpenseSubmitting = false }
        do {
            let updated = try await NetworkService.shared.createBusinessExpense(
                budgetId: selectedMoment.id,
                body: body,
                token: token
            )
            await refreshBusinessCatalog(token: token, budgetId: selectedMoment.id)
            businessMomentDetail = updated
            refreshBusinessInviteCapability(auth: auth)
            detailTitle = updated.budgetName
            detailLines = [
                ("Context", "Business"),
                ("Type", updated.budgetType ?? "N/A"),
                ("Status", updated.status ?? "N/A"),
                ("Budget period", updated.budgetPeriod ?? "N/A"),
                ("Department", updated.department ?? "N/A"),
                ("Approval threshold", DesignTokens.formatInr(updated.approvalThreshold ?? 0)),
                ("Total Budget", DesignTokens.formatInr(updated.totalBudget ?? 0)),
                ("Spent", DesignTokens.formatInr(updated.spentAmount ?? 0))
            ]
            showBusinessExpenseSheet = false
            joinToast = "Submitted for approval"
            await refreshBusinessMoments(auth: auth)
        } catch {
            joinToast = error.localizedDescription
        }
    }

    func refreshBusinessInviteLink(auth: AuthManager) async {
        guard let selectedMoment, selectedMoment.context == .business else { return }
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        if !businessShareJoinUrl.isEmpty { return }
        do {
            let out = try await NetworkService.shared.businessInviteLink(budgetId: selectedMoment.id, token: token)
            businessShareJoinUrl = out.joinUrl
        } catch {
            businessEmailResultMessage = error.localizedDescription
        }
    }

    func sendBusinessInviteEmail(auth: AuthManager, email: String, message: String?) async {
        guard let selectedMoment, selectedMoment.context == .business else { return }
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        businessEmailSending = true
        businessEmailResultMessage = nil
        defer { businessEmailSending = false }
        do {
            let body = GroupInviteEmailIn(
                emails: email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? [] : [email],
                message: message,
                resend: false
            )
            let out = try await NetworkService.shared.sendBusinessInviteEmails(
                budgetId: selectedMoment.id,
                body: body,
                token: token
            )
            let base = "Sent \(out.sent), failed \(out.failed) (total \(out.total))"
            let extra = out.errorMessages.filter { !$0.isEmpty }.joined(separator: "\n")
            businessEmailResultMessage = extra.isEmpty ? base : "\(base)\n\(extra)"
        } catch {
            businessEmailResultMessage = error.localizedDescription
        }
    }

    func acceptBusinessInvite(_ inv: BusinessPendingInviteOut, auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        do {
            do {
                _ = try await NetworkService.shared.joinBusinessBudget(budgetId: inv.budgetId, token: token)
            } catch {
                _ = try await NetworkService.shared.joinBusinessWithToken(rawToken: inv.inviteToken, token: token)
            }
            joinToast = "Joined \(inv.budgetName)"
            let pending = try await NetworkService.shared.businessPendingInvites(token: token)
            businessPendingInvites = pending.invites
            await refreshBusinessMoments(auth: auth)
            if let item = businessItems.first(where: { $0.id == inv.budgetId }) {
                selectedMoment = item
            }
        } catch {
            joinToast = error.localizedDescription
        }
    }

    func declineBusinessInvite(_ inv: BusinessPendingInviteOut, auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        do {
            _ = try await NetworkService.shared.declineBusinessInvite(memberId: inv.memberId, token: token)
            businessPendingInvites.removeAll { $0.memberId == inv.memberId }
            joinToast = "Invite declined"
        } catch {
            joinToast = error.localizedDescription
        }
    }

    func acceptGroupInvite(_ inv: GroupPendingInviteOut, auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        do {
            _ = try await NetworkService.shared.joinGroupWithToken(rawToken: inv.inviteToken, token: token)
            joinToast = "Joined \(inv.momentTitle)"
            let pending = try await NetworkService.shared.groupPendingInvites(token: token)
            groupPendingInvites = pending.invites
            await refreshGroupMoments(auth: auth)
            if let item = groupItems.first(where: { $0.id == inv.momentId }) {
                selectedMoment = item
            }
        } catch {
            joinToast = error.localizedDescription
        }
    }

    func declineGroupInvite(_ inv: GroupPendingInviteOut, auth: AuthManager) async {
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        do {
            _ = try await NetworkService.shared.declineGroupInvite(inviteId: inv.inviteId, token: token)
            groupPendingInvites.removeAll { $0.inviteId == inv.inviteId }
            joinToast = "Invite declined"
        } catch {
            joinToast = error.localizedDescription
        }
    }

    func handleInviteUrl(_ url: URL, auth: AuthManager) async {
        guard let parsed = InviteLinkParser.parse(url: url) else { return }
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        do {
            switch parsed.kind {
            case .business:
                _ = try await NetworkService.shared.joinBusinessWithToken(rawToken: parsed.token, token: token)
                selectedContext = .business
            case .group:
                _ = try await NetworkService.shared.joinGroupWithToken(rawToken: parsed.token, token: token)
                selectedContext = .group
            }
            joinToast = "You're in!"
            await load(auth: auth)
        } catch {
            joinToast = error.localizedDescription
        }
    }

    func handleScannedInvite(_ raw: String, auth: AuthManager) async {
        guard let parsed = InviteLinkParser.parsePayload(raw) else {
            joinToast = "Not a Momentra invite QR"
            return
        }
        guard let token = auth.getAccessToken(), !token.isEmpty else { return }
        do {
            switch parsed.kind {
            case .business:
                _ = try await NetworkService.shared.joinBusinessWithToken(rawToken: parsed.token, token: token)
                selectedContext = .business
            case .group:
                _ = try await NetworkService.shared.joinGroupWithToken(rawToken: parsed.token, token: token)
                selectedContext = .group
            }
            joinToast = "You're in!"
            showInviteQrScanner = false
            await load(auth: auth)
        } catch {
            joinToast = error.localizedDescription
        }
    }

}

private func timeOfDayLabel() -> String {
    let hour = Calendar.current.component(.hour, from: Date())
    if hour < 12 { return "morning" }
    if hour < 17 { return "afternoon" }
    return "evening"
}
