package app.momentra.ui.home

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import app.momentra.network.GroupInviteEmailIn
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraElevatedCard
import app.momentra.ui.theme.MomentraPrimaryButton

private fun inviteFieldColors(accent: Color) = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = accent,
    unfocusedBorderColor = DesignTokens.base.s300,
    focusedLabelColor = accent,
    unfocusedLabelColor = DesignTokens.base.onDark60,
    focusedTextColor = DesignTokens.base.onDark,
    unfocusedTextColor = DesignTokens.base.onDark,
    cursorColor = accent,
    focusedContainerColor = DesignTokens.base.s100,
    unfocusedContainerColor = DesignTokens.base.s100,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupInviteSheet(
    contextAccent: Color,
    joinUrl: String,
    sheetKey: Int,
    isSendingEmail: Boolean,
    emailResultMessage: String?,
    onDismiss: () -> Unit,
    onSendEmail: (GroupInviteEmailIn) -> Unit,
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    var emailInput by remember(sheetKey) { mutableStateOf("") }
    var messageInput by remember(sheetKey) { mutableStateOf("You've been invited to join a group moment on Momentra.") }

    val qrBitmap = remember(joinUrl) {
        if (joinUrl.isBlank()) null else encodeQrBitmap(joinUrl, 280)
    }
    val groupTheme = DesignTokens.theme(MomentraContext.Group)
    val inviteCtaStyle = DesignTokens.ActionStyle(
        solid = contextAccent,
        solidAlt = groupTheme.accentEnd,
        gradientStart = contextAccent,
        gradientEnd = groupTheme.accentEnd,
        text = DesignTokens.semantic.ctaText,
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.imePadding(),
        containerColor = DesignTokens.base.s100,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(
                    horizontal = DesignTokens.spacing.screenH,
                    vertical = DesignTokens.spacing.item,
                ),
        ) {
            Text(
                "Invite people",
                color = DesignTokens.base.onDark,
                style = DesignTokens.type.titleLG,
            )
            Spacer(Modifier.height(DesignTokens.spacing.item))
            Text(
                "Share this link or scan the QR code. Email is sent via Momentra (Resend).",
                color = DesignTokens.base.brandText,
                style = DesignTokens.type.caption,
            )
            Spacer(Modifier.height(DesignTokens.spacing.screenV))

            MomentraElevatedCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = DesignTokens.spacing.section,
            ) {
                if (joinUrl.isBlank()) {
                    Text(
                        "Invite link is loading. Close and reopen, or try again in a moment.",
                        color = DesignTokens.base.brandText,
                        style = DesignTokens.type.caption,
                    )
                    Spacer(Modifier.height(DesignTokens.spacing.section))
                }

                qrBitmap?.let { bmp ->
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = "QR code for invite link",
                        modifier = Modifier
                            .size(200.dp)
                            .align(Alignment.CenterHorizontally)
                            .clip(RoundedCornerShape(DesignTokens.radius.input))
                            .background(DesignTokens.semantic.qrSurface)
                            .padding(DesignTokens.spacing.item),
                    )
                    Spacer(Modifier.height(DesignTokens.spacing.section))
                }

                OutlinedTextField(
                    value = joinUrl,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Invite link") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = inviteFieldColors(contextAccent),
                )
                Spacer(Modifier.height(DesignTokens.spacing.section))

                TextButton(
                    onClick = {
                        if (joinUrl.isNotBlank()) {
                            clipboard.setText(AnnotatedString(joinUrl))
                        }
                    },
                    enabled = joinUrl.isNotBlank(),
                    modifier = Modifier.align(Alignment.Start),
                ) {
                    Text("Copy link", color = contextAccent, style = DesignTokens.type.titleSM)
                }
                TextButton(
                    onClick = {
                        if (joinUrl.isBlank()) return@TextButton
                        val send = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, joinUrl)
                        }
                        context.startActivity(Intent.createChooser(send, "Share invite link"))
                    },
                    enabled = joinUrl.isNotBlank(),
                    modifier = Modifier.align(Alignment.Start),
                ) {
                    Text("Share…", color = contextAccent, style = DesignTokens.type.titleSM)
                }
            }

            Spacer(Modifier.height(DesignTokens.spacing.screenV))
            Text("Email invite", color = DesignTokens.base.onDark, style = DesignTokens.type.titleMD)
            Spacer(Modifier.height(DesignTokens.spacing.inline))

            MomentraElevatedCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = DesignTokens.spacing.section,
            ) {
                OutlinedTextField(
                    value = emailInput,
                    onValueChange = { emailInput = it },
                    label = { Text("Email address") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = inviteFieldColors(contextAccent),
                )
                Spacer(Modifier.height(DesignTokens.spacing.item))
                OutlinedTextField(
                    value = messageInput,
                    onValueChange = { messageInput = it },
                    label = { Text("Short message") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    colors = inviteFieldColors(contextAccent),
                )
                emailResultMessage?.let {
                    Text(
                        it,
                        color = DesignTokens.base.brandText,
                        style = DesignTokens.type.caption,
                        modifier = Modifier.padding(top = DesignTokens.spacing.item),
                    )
                }

                Spacer(Modifier.height(DesignTokens.spacing.cardH))
                MomentraPrimaryButton(
                    label = "Send email",
                    onClick = {
                        val trimmed = emailInput.trim()
                        val emails = if (trimmed.isNotEmpty()) listOf(trimmed) else emptyList()
                        onSendEmail(
                            GroupInviteEmailIn(
                                emails = emails,
                                message = messageInput.trim().ifBlank { null },
                                resend = false,
                            ),
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    actionStyle = inviteCtaStyle,
                    enabled = !isSendingEmail,
                    loading = isSendingEmail,
                )
            }
            Spacer(Modifier.height(DesignTokens.spacing.screenH))
        }
    }
}
