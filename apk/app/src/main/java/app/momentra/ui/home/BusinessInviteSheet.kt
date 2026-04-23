package app.momentra.ui.home

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.momentra.network.GroupInviteEmailIn
import app.momentra.ui.theme.DesignTokens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessInviteSheet(
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
    var messageInput by remember(sheetKey) {
        mutableStateOf("You've been invited to join a business workspace on Momentra.")
    }

    val qrBitmap = remember(joinUrl) {
        if (joinUrl.isBlank()) null else encodeQrBitmap(joinUrl, 280)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.imePadding(),
        containerColor = DesignTokens.base.s100,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            Text(
                "Invite team",
                color = DesignTokens.base.onDark,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Share this link or scan the QR code. Email is sent via Momentra (Resend).",
                color = DesignTokens.base.brandText,
                fontSize = 12.sp,
            )
            Spacer(Modifier.height(16.dp))

            if (joinUrl.isBlank()) {
                Text(
                    "Invite link is loading. Close and reopen, or try again in a moment.",
                    color = DesignTokens.base.brandText,
                    fontSize = 12.sp,
                )
                Spacer(Modifier.height(12.dp))
            }

            qrBitmap?.let { bmp ->
                Image(
                    bitmap = bmp.asImageBitmap(),
                    contentDescription = "QR code for business invite link",
                    modifier = Modifier
                        .size(200.dp)
                        .align(Alignment.CenterHorizontally)
                        .clip(RoundedCornerShape(12.dp))
                        .background(DesignTokens.semantic.qrSurface)
                        .padding(8.dp),
                )
            }
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = joinUrl,
                onValueChange = {},
                readOnly = true,
                label = { Text("Invite link") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))

            TextButton(
                onClick = {
                    if (joinUrl.isNotBlank()) {
                        clipboard.setText(AnnotatedString(joinUrl))
                    }
                },
                enabled = joinUrl.isNotBlank(),
                modifier = Modifier.align(Alignment.Start),
            ) {
                Text("Copy link", color = contextAccent, fontWeight = FontWeight.SemiBold)
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
                Text("Share…", color = contextAccent, fontWeight = FontWeight.SemiBold)
            }

            Spacer(Modifier.height(16.dp))
            Text("Email invite", color = DesignTokens.base.onDark, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = emailInput,
                onValueChange = { emailInput = it },
                label = { Text("Email address") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = messageInput,
                onValueChange = { messageInput = it },
                label = { Text("Short message") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
            )
            emailResultMessage?.let {
                Text(it, color = DesignTokens.base.brandText, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }

            Spacer(Modifier.height(14.dp))
            if (isSendingEmail) {
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(28.dp)
                        .align(Alignment.CenterHorizontally),
                    color = contextAccent,
                )
            } else {
                TextButton(
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
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text("Send email", color = contextAccent, fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(Modifier.height(18.dp))
        }
    }
}
