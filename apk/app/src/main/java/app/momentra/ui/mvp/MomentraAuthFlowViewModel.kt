package app.momentra.ui.mvp

import androidx.lifecycle.ViewModel
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** Holds phone/OTP state across auth screens (iOS uses navigation + local state). */
class MomentraAuthFlowViewModel : ViewModel() {
    private val _nationalNumber = MutableStateFlow("")
    val nationalNumber: StateFlow<String> = _nationalNumber.asStateFlow()

    private val _phoneDisplay = MutableStateFlow("")
    val phoneDisplay: StateFlow<String> = _phoneDisplay.asStateFlow()

    private val _verificationId = MutableStateFlow<String?>(null)
    val verificationId: StateFlow<String?> = _verificationId.asStateFlow()

    private val _phoneE164 = MutableStateFlow<String?>(null)
    val phoneE164: StateFlow<String?> = _phoneE164.asStateFlow()

    private val _resendToken = MutableStateFlow<PhoneAuthProvider.ForceResendingToken?>(null)
    val resendToken: StateFlow<PhoneAuthProvider.ForceResendingToken?> = _resendToken.asStateFlow()

    private val _otp = MutableStateFlow("")
    val otp: StateFlow<String> = _otp.asStateFlow()

    /** Increment when OTP screen should restart the 60s resend cooldown (open + successful resend). */
    private val _otpResendEpoch = MutableStateFlow(0)
    val otpResendEpoch: StateFlow<Int> = _otpResendEpoch.asStateFlow()

    fun setNationalDigits(digits: String) {
        _nationalNumber.value = digits.filter(Char::isDigit).take(10)
    }

    fun setPhoneDisplay(display: String) {
        _phoneDisplay.value = display
    }

    fun setVerificationId(id: String?) {
        _verificationId.value = id
    }

    fun setPhoneE164(e164: String?) {
        _phoneE164.value = e164
    }

    fun setResendToken(token: PhoneAuthProvider.ForceResendingToken?) {
        _resendToken.value = token
    }

    fun setOtp(value: String) {
        _otp.update { value.filter(Char::isDigit).take(6) }
    }

    fun clearPhoneFlow() {
        _nationalNumber.value = ""
        _phoneDisplay.value = ""
        _verificationId.value = null
        _phoneE164.value = null
        _resendToken.value = null
        _otp.value = ""
    }

    fun clearOtp() {
        _otp.value = ""
    }

    fun bumpOtpResendCooldown() {
        _otpResendEpoch.update { it + 1 }
    }
}
