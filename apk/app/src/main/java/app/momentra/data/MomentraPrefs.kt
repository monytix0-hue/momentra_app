package app.momentra.data

import android.content.Context

class MomentraPrefs(context: Context) {
    private val p = context.applicationContext.getSharedPreferences("momentra", Context.MODE_PRIVATE)

    var onboardingCompleted: Boolean
        get() = p.getBoolean(KEY_ONBOARDING, false)
        set(value) {
            p.edit().putBoolean(KEY_ONBOARDING, value).apply()
        }

    companion object {
        private const val KEY_ONBOARDING = "onboarding_completed"
    }
}
