package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ReceiptUploadOut(
    @SerialName("receipt_id") val receiptId: String,
    @SerialName("public_url") val publicUrl: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("file_path") val filePath: String,
    @SerialName("mime_type") val mimeType: String? = null,
    @SerialName("file_size_bytes") val fileSizeBytes: Int? = null,
)
