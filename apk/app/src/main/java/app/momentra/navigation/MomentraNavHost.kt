package app.momentra.navigation

import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.CustomCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import app.momentra.R
import app.momentra.data.AuthRepository
import app.momentra.data.MomentraPrefs
import app.momentra.data.PhoneVerifyResult
import app.momentra.ui.home.HomeScreen
import app.momentra.ui.mvp.MomentraAuthFlowViewModel
import app.momentra.ui.mvp.OnboardingMVPScreen
import app.momentra.ui.mvp.OtpVerifyScreen
import app.momentra.ui.mvp.PhoneLoginScreen
import app.momentra.ui.setup.SetupWizardScreen
import app.momentra.ui.splash.SplashScreen
import app.momentra.ui.theme.DesignTokens
import app.momentra.ui.theme.MomentraContext
import app.momentra.ui.theme.MomentraTheme
import kotlinx.coroutines.launch

@Composable
fun MomentraApp(
    authRepository: AuthRepository,
    prefs: MomentraPrefs,
) {
    MomentraTheme {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding(),
            color = DesignTokens.base.bg,
        ) {
            val navController = rememberNavController()
            val authFlow: MomentraAuthFlowViewModel = viewModel()
            MomentraNavHost(
                navController = navController,
                authRepository = authRepository,
                prefs = prefs,
                authFlow = authFlow,
            )
        }
    }
}

@Composable
fun MomentraNavHost(
    navController: NavHostController,
    authRepository: AuthRepository,
    prefs: MomentraPrefs,
    authFlow: MomentraAuthFlowViewModel,
) {
    val scope = rememberCoroutineScope()
    val activity = LocalContext.current as ComponentActivity
    val ctx = LocalContext.current
    var phoneLoading by remember { mutableStateOf(false) }
    var otpLoading by remember { mutableStateOf(false) }
    var otpResendLoading by remember { mutableStateOf(false) }
    fun destinationFromProfile(setupCompleted: Boolean): String {
        if (!setupCompleted) return MomentraDestinations.SETUP_WIZARD
        return MomentraDestinations.HOME_PERSONAL
    }

    NavHost(
        navController = navController,
        startDestination = MomentraDestinations.SPLASH,
    ) {
        composable(MomentraDestinations.SPLASH) {
            SplashScreen(
                onFinish = {
                    val user = authRepository.currentUser
                    if (user != null) {
                        scope.launch {
                            val target = authRepository.me().fold(
                                onSuccess = { me ->
                                    destinationFromProfile(me.setupCompleted)
                                },
                                onFailure = {
                                    MomentraDestinations.SETUP_WIZARD
                                },
                            )
                            navController.navigate(target) {
                                popUpTo(MomentraDestinations.SPLASH) { inclusive = true }
                            }
                        }
                    } else {
                        val next =
                            if (!prefs.onboardingCompleted) {
                                MomentraDestinations.ONBOARDING_MVP
                            } else {
                                MomentraDestinations.AUTH_PHONE
                            }
                        navController.navigate(next) {
                            popUpTo(MomentraDestinations.SPLASH) { inclusive = true }
                        }
                    }
                },
            )
        }

        composable(MomentraDestinations.ONBOARDING_MVP) {
            OnboardingMVPScreen(
                onGetStarted = {
                    prefs.onboardingCompleted = true
                    navController.navigate(MomentraDestinations.AUTH_PHONE) {
                        popUpTo(MomentraDestinations.ONBOARDING_MVP) { inclusive = true }
                    }
                },
                onSignIn = {
                    prefs.onboardingCompleted = true
                    navController.navigate(MomentraDestinations.AUTH_PHONE) {
                        popUpTo(MomentraDestinations.ONBOARDING_MVP) { inclusive = true }
                    }
                },
            )
        }

        composable(MomentraDestinations.AUTH_PHONE) {
            val nationalNumber by authFlow.nationalNumber.collectAsStateWithLifecycle()
            PhoneLoginScreen(
                nationalNumber = nationalNumber,
                onNationalNumberChange = { authFlow.setNationalDigits(it) },
                loading = phoneLoading,
                onSendOtp = {
                    scope.launch {
                        phoneLoading = true
                        try {
                            val e164 = "+91" + nationalNumber
                            val display =
                                "+91 ${nationalNumber.take(5)} ${nationalNumber.drop(5)}"
                            authFlow.setPhoneDisplay(display)
                            when (val r = authRepository.verifyPhoneNumber(activity, e164)) {
                                is PhoneVerifyResult.CodeSent -> {
                                    authFlow.setVerificationId(r.verificationId)
                                    authFlow.setResendToken(r.resendToken)
                                    authFlow.setPhoneE164(e164)
                                    authFlow.clearOtp()
                                    authFlow.bumpOtpResendCooldown()
                                    navController.navigate(MomentraDestinations.AUTH_OTP)
                                }
                                is PhoneVerifyResult.InstantCredential -> {
                                    authRepository.signInWithPhoneCredential(r.credential).fold(
                                        onSuccess = {
                                            authRepository.exchangeSession().fold(
                                                onSuccess = {
                                                    authRepository.me().fold(
                                                        onSuccess = { me ->
                                                            val target = destinationFromProfile(me.setupCompleted)
                                                            navController.navigate(target) {
                                                                popUpTo(MomentraDestinations.AUTH_PHONE) {
                                                                    inclusive = true
                                                                }
                                                            }
                                                        },
                                                        onFailure = {
                                                            navController.navigate(MomentraDestinations.SETUP_WIZARD) {
                                                                popUpTo(MomentraDestinations.AUTH_PHONE) {
                                                                    inclusive = true
                                                                }
                                                            }
                                                        },
                                                    )
                                                },
                                                onFailure = { e ->
                                                    Toast.makeText(
                                                        ctx,
                                                        e.message,
                                                        Toast.LENGTH_LONG,
                                                    ).show()
                                                },
                                            )
                                        },
                                        onFailure = { e ->
                                            Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show()
                                        },
                                    )
                                }
                            }
                        } catch (e: Exception) {
                            Toast.makeText(ctx, e.message ?: "Phone verify failed", Toast.LENGTH_LONG)
                                .show()
                        } finally {
                            phoneLoading = false
                        }
                    }
                },
                onGoogleSignIn = {
                    val webClientId = ctx.getString(R.string.default_web_client_id).trim()
                    if (webClientId.isBlank()) {
                        Toast.makeText(
                            ctx,
                            "Google Sign-In is not configured (missing default_web_client_id).",
                            Toast.LENGTH_LONG,
                        ).show()
                        return@PhoneLoginScreen
                    }
                    val credentialManager = CredentialManager.create(ctx)
                    // Explicit Google button flow should use SignInWithGoogle option to show account chooser.
                    val googleIdOption = GetSignInWithGoogleOption.Builder(webClientId)
                        .build()

                    val request = GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()

                    scope.launch {
                        try {
                            val result = credentialManager.getCredential(
                                context = ctx,
                                request = request
                            )
                            val credential = result.credential
                            if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                authRepository.signInWithGoogleToken(googleIdTokenCredential.idToken).fold(
                                    onSuccess = {
                                        authRepository.exchangeSession().fold(
                                            onSuccess = {
                                                authRepository.me().fold(
                                                    onSuccess = { me ->
                                                        val target = destinationFromProfile(me.setupCompleted)
                                                        navController.navigate(target) {
                                                            popUpTo(MomentraDestinations.AUTH_PHONE) { inclusive = true }
                                                        }
                                                    },
                                                    onFailure = {
                                                        navController.navigate(MomentraDestinations.SETUP_WIZARD) {
                                                            popUpTo(MomentraDestinations.AUTH_PHONE) { inclusive = true }
                                                        }
                                                    },
                                                )
                                            },
                                            onFailure = { e -> Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show() }
                                        )
                                    },
                                    onFailure = { e -> Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show() }
                                )
                            }
                        } catch (e: Exception) {
                            Toast.makeText(ctx, "Google Sign-In failed: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                },
            )
        }

        composable(MomentraDestinations.AUTH_OTP) {
            val phoneDisplay by authFlow.phoneDisplay.collectAsStateWithLifecycle()
            val otpDigits by authFlow.otp.collectAsStateWithLifecycle()
            val verificationIdState by authFlow.verificationId.collectAsStateWithLifecycle()
            val phoneE164State by authFlow.phoneE164.collectAsStateWithLifecycle()
            val resendTokenState by authFlow.resendToken.collectAsStateWithLifecycle()
            val otpResendEpoch by authFlow.otpResendEpoch.collectAsStateWithLifecycle()
            OtpVerifyScreen(
                phoneDisplay = phoneDisplay,
                otp = otpDigits,
                onOtpChange = { authFlow.setOtp(it) },
                loading = otpLoading,
                resendLoading = otpResendLoading,
                resendCooldownReset = otpResendEpoch,
                onVerify = otpVerify@{
                    val vid = verificationIdState
                    if (vid == null) {
                        Toast.makeText(ctx, "Missing verification id", Toast.LENGTH_SHORT).show()
                        return@otpVerify
                    }
                    scope.launch {
                        otpLoading = true
                        authRepository.verifyPhoneOtp(vid, otpDigits).fold(
                            onSuccess = {
                                authRepository.exchangeSession().fold(
                                    onSuccess = {
                                        otpLoading = false
                                        authFlow.clearPhoneFlow()
                                        authRepository.me().fold(
                                            onSuccess = { me ->
                                                val target = destinationFromProfile(me.setupCompleted)
                                                navController.navigate(target) {
                                                    popUpTo(MomentraDestinations.SPLASH) { inclusive = true }
                                                }
                                            },
                                            onFailure = {
                                                navController.navigate(MomentraDestinations.SETUP_WIZARD) {
                                                    popUpTo(MomentraDestinations.SPLASH) { inclusive = true }
                                                }
                                            },
                                        )
                                    },
                                    onFailure = { e ->
                                        otpLoading = false
                                        Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show()
                                    },
                                )
                            },
                            onFailure = { e ->
                                otpLoading = false
                                Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show()
                            },
                        )
                    }
                },
                onBack = { navController.popBackStack() },
                onChangeNumber = {
                    authFlow.clearOtp()
                    navController.popBackStack()
                },
                onResend = {
                    scope.launch {
                        val t = resendTokenState
                        val pe = phoneE164State
                        if (t == null || pe.isNullOrBlank()) {
                            Toast.makeText(ctx, "Cannot resend code right now.", Toast.LENGTH_SHORT).show()
                            return@launch
                        }
                        otpResendLoading = true
                        try {
                            when (val r = authRepository.resendPhoneOtp(activity, pe, t)) {
                                is PhoneVerifyResult.CodeSent -> {
                                    authFlow.setVerificationId(r.verificationId)
                                    authFlow.setResendToken(r.resendToken)
                                    authFlow.clearOtp()
                                    authFlow.bumpOtpResendCooldown()
                                    Toast.makeText(ctx, "A new code was sent.", Toast.LENGTH_SHORT).show()
                                }
                                is PhoneVerifyResult.InstantCredential -> {
                                    authRepository.signInWithPhoneCredential(r.credential).fold(
                                        onSuccess = {
                                            authRepository.exchangeSession().fold(
                                                onSuccess = {
                                                    authFlow.clearPhoneFlow()
                                                    authRepository.me().fold(
                                                        onSuccess = { me ->
                                                            val target = destinationFromProfile(me.setupCompleted)
                                                            navController.navigate(target) {
                                                                popUpTo(MomentraDestinations.SPLASH) { inclusive = true }
                                                            }
                                                        },
                                                        onFailure = {
                                                            navController.navigate(MomentraDestinations.SETUP_WIZARD) {
                                                                popUpTo(MomentraDestinations.SPLASH) { inclusive = true }
                                                            }
                                                        },
                                                    )
                                                },
                                                onFailure = { e ->
                                                    Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show()
                                                },
                                            )
                                        },
                                        onFailure = { e ->
                                            Toast.makeText(ctx, e.message, Toast.LENGTH_LONG).show()
                                        },
                                    )
                                }
                            }
                        } catch (e: Exception) {
                            Toast.makeText(ctx, e.message ?: "Resend failed", Toast.LENGTH_LONG).show()
                        } finally {
                            otpResendLoading = false
                        }
                    }
                },
            )
        }

        composable(MomentraDestinations.SETUP_WIZARD) {
            SetupWizardScreen(
                onFinish = { primaryFocus, defaultCurrency, organizationName ->
                    scope.launch {
                        authRepository.syncUserProfile(primaryFocus, defaultCurrency, organizationName).fold(
                            onSuccess = {
                                val target = destinationFromProfile(true)
                                navController.navigate(target) {
                                    popUpTo(MomentraDestinations.SETUP_WIZARD) { inclusive = true }
                                }
                            },
                            onFailure = { e ->
                                Toast.makeText(ctx, e.message ?: "Setup save failed", Toast.LENGTH_LONG).show()
                            },
                        )
                    }
                },
            )
        }

        composable(MomentraDestinations.HOME_PERSONAL) {
            HomeScreen(
                authRepository = authRepository,
                initialContext = MomentraContext.Personal,
                onSignOut = {
                    authRepository.signOut()
                    authFlow.clearPhoneFlow()
                    navController.navigate(MomentraDestinations.AUTH_PHONE) {
                        popUpTo(MomentraDestinations.HOME_PERSONAL) { inclusive = true }
                    }
                },
            )
        }

        composable(MomentraDestinations.HOME_GROUP) {
            HomeScreen(
                authRepository = authRepository,
                initialContext = MomentraContext.Group,
                onSignOut = {
                    authRepository.signOut()
                    authFlow.clearPhoneFlow()
                    navController.navigate(MomentraDestinations.AUTH_PHONE) {
                        popUpTo(MomentraDestinations.HOME_GROUP) { inclusive = true }
                    }
                },
            )
        }

        composable(MomentraDestinations.HOME_BUSINESS) {
            HomeScreen(
                authRepository = authRepository,
                initialContext = MomentraContext.Business,
                onSignOut = {
                    authRepository.signOut()
                    authFlow.clearPhoneFlow()
                    navController.navigate(MomentraDestinations.AUTH_PHONE) {
                        popUpTo(MomentraDestinations.HOME_BUSINESS) { inclusive = true }
                    }
                },
            )
        }
    }
}
