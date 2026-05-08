package app.momentra.data.personal

import app.momentra.data.AuthRepository
import app.momentra.network.PersonalCategoryListOut
import app.momentra.network.PersonalMomentCreateIn
import app.momentra.network.PersonalMomentCreateOut
import app.momentra.network.PersonalMomentListResponse
import app.momentra.network.PersonalMomentPatchIn
import app.momentra.network.PersonalMomentItemOut
import app.momentra.network.PersonalReminderCreateIn
import app.momentra.network.PersonalReminderOut
import app.momentra.network.PersonalReminderPatchIn
import app.momentra.network.PersonalHomeOut
import app.momentra.network.PersonalTransactionCreateIn
import app.momentra.network.PersonalTransactionListOut
import app.momentra.network.PersonalTransactionOut
import app.momentra.network.PersonalTransactionPatchIn

class PersonalApiRepository(
    private val authRepository: AuthRepository,
) {
    suspend fun home(): Result<PersonalHomeOut> = authRepository.personalHome()
    suspend fun moments(): Result<PersonalMomentListResponse> = authRepository.personalMoments()
    suspend fun createMoment(body: PersonalMomentCreateIn): Result<PersonalMomentCreateOut> =
        authRepository.createPersonalMoment(body)
    suspend fun patchMoment(momentId: String, body: PersonalMomentPatchIn): Result<PersonalMomentItemOut> =
        authRepository.patchPersonalMoment(momentId, body)
    suspend fun transactions(limit: Int = 10): Result<PersonalTransactionListOut> =
        authRepository.personalTransactions(limit)
    suspend fun createTransaction(body: PersonalTransactionCreateIn): Result<PersonalTransactionOut> =
        authRepository.createPersonalTransaction(body)
    suspend fun patchTransaction(transactionId: String, body: PersonalTransactionPatchIn): Result<PersonalTransactionOut> =
        authRepository.patchPersonalTransaction(transactionId, body)
    suspend fun categories(kind: String): Result<PersonalCategoryListOut> =
        authRepository.personalCategories(kind)
    suspend fun reminders(upcoming: Boolean = true, limit: Int = 50): Result<List<PersonalReminderOut>> =
        authRepository.personalReminders(upcoming, limit)
    suspend fun createReminder(body: PersonalReminderCreateIn): Result<PersonalReminderOut> =
        authRepository.createPersonalReminder(body)
    suspend fun patchReminder(reminderId: String, body: PersonalReminderPatchIn): Result<PersonalReminderOut> =
        authRepository.patchPersonalReminder(reminderId, body)
    suspend fun deleteReminder(reminderId: String): Result<Unit> =
        authRepository.deletePersonalReminder(reminderId)
}

