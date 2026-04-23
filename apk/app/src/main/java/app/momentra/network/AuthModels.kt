package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TokenExchangeRequest(
    @SerialName("firebase_token") val firebaseToken: String,
)

@Serializable
data class AuthResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    val user: MomentraUserDto,
)

@Serializable
data class MomentraUserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    @SerialName("phone_number") val phoneNumber: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)
