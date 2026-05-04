import SwiftUI

struct GroupInviteSheetView: View {
    let joinUrl: String
    let sheetKey: Int
    let isSending: Bool
    let resultMessage: String?
    let accent: Color
    let onDismiss: () -> Void
    let onSendEmail: (String, String?) -> Void
    let onRefreshLink: () -> Void

    @State private var email: String = ""
    @State private var message: String = "You've been invited to join a group moment on Momentra."

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if joinUrl.isEmpty {
                        Text("Loading invite link…")
                            .font(.caption)
                            .foregroundColor(DesignTokens.group.text)
                        Button("Retry") { onRefreshLink() }
                            .foregroundColor(accent)
                    } else {
                        Text(joinUrl)
                            .font(.caption)
                            .foregroundColor(DesignTokens.base.onDark)
                            .textSelection(.enabled)
                        if #available(iOS 16.0, *) {
                            ShareLink(item: joinUrl) {
                                Text("Share link…")
                                    .foregroundColor(accent)
                            }
                        }
                    }
                } header: {
                    Text("Invite link")
                } footer: {
                    Text("Recipients can open the link or scan a QR from this URL on another device.")
                        .font(.caption2)
                }

                Section("Email (Resend)") {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                    TextField("Message", text: $message, axis: .vertical)
                        .lineLimit(3...6)
                    if let resultMessage, !resultMessage.isEmpty {
                        Text(resultMessage)
                            .font(.caption)
                            .foregroundColor(DesignTokens.group.text)
                    }
                    if isSending {
                        ProgressView().tint(accent)
                    } else {
                        Button("Send email") {
                            onSendEmail(email, message.isEmpty ? nil : message)
                        }
                        .foregroundColor(accent)
                    }
                }
            }
            .momentraFormSheetChrome()
            .navigationTitle("Invite people")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: onDismiss)
                        .disabled(isSending)
                }
            }
        }
        .tint(accent)
        .toolbarBackground(DesignTokens.base.s100, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .id(sheetKey)
    }
}
