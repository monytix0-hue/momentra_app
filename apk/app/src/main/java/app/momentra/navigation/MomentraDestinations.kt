package app.momentra.navigation

/**
 * Routes aligned with iOS `AppRootView`: splash → onboarding MVP → phone → OTP → home.
 */
object MomentraDestinations {
    const val SPLASH = "splash"
    const val ONBOARDING_MVP = "onboarding/mvp"
    const val AUTH_PHONE = "auth/phone"
    const val AUTH_OTP = "auth/otp"
    const val SETUP_WIZARD = "setup/wizard"
    const val HOME_PERSONAL = "home/personal"
    const val HOME_GROUP = "home/group"
    const val HOME_BUSINESS = "home/business"
}
