package app.momentra.data.business

import app.momentra.data.AuthRepository
import app.momentra.network.BusinessBudgetCreateIn
import app.momentra.network.BusinessBudgetCreateOut
import app.momentra.network.BusinessBudgetListOut
import app.momentra.network.BusinessBudgetMemberIn
import app.momentra.network.BusinessCatalogOut
import app.momentra.network.BusinessExpenseCreateIn
import app.momentra.network.BusinessPendingInvitesOut
import app.momentra.network.BusinessVendorCreateIn
import app.momentra.network.BusinessVendorPatchIn

class BusinessApiRepository(
    private val authRepository: AuthRepository,
) {
    suspend fun moments(): Result<BusinessBudgetListOut> = authRepository.businessMoments()
    suspend fun createMoment(body: BusinessBudgetCreateIn): Result<BusinessBudgetCreateOut> =
        authRepository.createBusinessMoment(body)
    suspend fun momentDetail(budgetId: String): Result<BusinessBudgetCreateOut> =
        authRepository.businessMomentDetail(budgetId)
    suspend fun catalog(budgetId: String): Result<BusinessCatalogOut> =
        authRepository.businessBudgetCatalog(budgetId)
    suspend fun createExpense(budgetId: String, body: BusinessExpenseCreateIn): Result<BusinessBudgetCreateOut> =
        authRepository.createBusinessExpense(budgetId, body)
    suspend fun addMember(budgetId: String, body: BusinessBudgetMemberIn): Result<BusinessBudgetCreateOut> =
        authRepository.addBusinessBudgetMember(budgetId, body)
    suspend fun createVendor(budgetId: String, body: BusinessVendorCreateIn): Result<BusinessBudgetCreateOut> =
        authRepository.createBusinessVendor(budgetId, body)
    suspend fun patchVendor(
        budgetId: String,
        vendorId: String,
        body: BusinessVendorPatchIn,
    ): Result<BusinessBudgetCreateOut> = authRepository.patchBusinessVendor(budgetId, vendorId, body)
    suspend fun pendingInvites(): Result<BusinessPendingInvitesOut> = authRepository.businessPendingInvites()
}

