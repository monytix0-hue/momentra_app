package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MeResponse(
    val uid: String? = null,
    val email: String? = null,
    @SerialName("phone_number") val phoneNumber: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("primary_use") val primaryUse: String? = null,
    @SerialName("primary_focus") val primaryFocus: String? = null,
    @SerialName("default_currency") val defaultCurrency: String? = null,
    @SerialName("organization_name") val organizationName: String? = null,
    @SerialName("setup_completed") val setupCompleted: Boolean = false,
)

@Serializable
data class SyncUserRequest(
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("upi_or_phone") val upiOrPhone: String? = null,
    @SerialName("primary_use") val primaryUse: String? = null,
    @SerialName("primary_focus") val primaryFocus: String? = null,
    @SerialName("default_currency") val defaultCurrency: String? = null,
    @SerialName("organization_name") val organizationName: String? = null,
    @SerialName("setup_completed") val setupCompleted: Boolean? = null,
)
