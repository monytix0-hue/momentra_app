package app.momentra.invite

import android.net.Uri
import java.net.URLDecoder

enum class InviteLinkKind {
    GROUP,
    BUSINESS,
}

data class ParsedInviteLink(
    val kind: InviteLinkKind,
    val token: String,
)

fun parseInviteUri(uri: Uri): ParsedInviteLink? {
    val path = (uri.path ?: "").trimEnd('/')
    val businessSeg = "/business/join/"
    val groupSeg = "/join/"
    return when {
        path.contains(businessSeg) -> {
            val raw = path.substringAfter(businessSeg)
            val token = URLDecoder.decode(raw, Charsets.UTF_8.name()).trim()
            if (token.isBlank()) null else ParsedInviteLink(InviteLinkKind.BUSINESS, token)
        }
        path.contains(groupSeg) -> {
            val raw = path.substringAfter(groupSeg)
            val token = URLDecoder.decode(raw, Charsets.UTF_8.name()).trim()
            if (token.isBlank()) null else ParsedInviteLink(InviteLinkKind.GROUP, token)
        }
        else -> null
    }
}

/** Parses a QR payload: full https URL or a bare hex token (treated as group join). */
fun parseInvitePayload(raw: String): ParsedInviteLink? {
    val t = raw.trim()
    if (t.isEmpty()) return null
    if (t.startsWith("http://", ignoreCase = true) || t.startsWith("https://", ignoreCase = true)) {
        return parseInviteUri(Uri.parse(t))
    }
    if (t.length >= 32 && t.all { c -> c.isLetterOrDigit() }) {
        return ParsedInviteLink(InviteLinkKind.GROUP, t)
    }
    return null
}
