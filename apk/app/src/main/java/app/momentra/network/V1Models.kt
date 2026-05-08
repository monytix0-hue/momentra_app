package app.momentra.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class V1HealthOut(
    @SerialName("moment_id") val momentId: String,
    @SerialName("composite_score") val compositeScore: Double,
    @SerialName("health_state") val healthState: String,
    val trend: String? = null,
    @SerialName("calculated_at") val calculatedAt: String,
    val breakdown: JsonObject = JsonObject(mapOf()),
)

@Serializable
data class V1CommitmentOut(
    @SerialName("commitment_id") val commitmentId: String,
    @SerialName("moment_id") val momentId: String,
    @SerialName("member_id") val memberId: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val email: String? = null,
    @SerialName("committed_amount") val committedAmount: Double,
    @SerialName("fulfilled_amount") val fulfilledAmount: Double,
    @SerialName("amount_remaining") val amountRemaining: Double,
    @SerialName("due_date") val dueDate: String? = null,
    val status: String,
    @SerialName("overdue_days") val overdueDays: Int = 0,
)

@Serializable
data class V1SignalOut(
    @SerialName("signal_id") val signalId: String,
    @SerialName("moment_id") val momentId: String,
    @SerialName("scope_type") val scopeType: String,
    @SerialName("signal_type") val signalType: String,
    val severity: String,
    val title: String,
    val message: String,
    val resolved: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class V1GuidanceOut(
    @SerialName("guidance_id") val guidanceId: String,
    @SerialName("moment_id") val momentId: String,
    val title: String,
    val message: String,
    val priority: Int = 3,
    val read: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
)
