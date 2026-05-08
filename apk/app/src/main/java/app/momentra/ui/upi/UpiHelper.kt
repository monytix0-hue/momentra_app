package app.momentra.ui.upi

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * UPI deep link utilities for constructing and opening UPI payment URIs.
 *
 * Supports the standard [upi://pay] scheme and [tez://upi/pay] as a fallback
 * for Google Pay on devices where the standard scheme is not routed.
 */
object UpiHelper {

    /**
     * Builds a standard UPI deep link URI string using the [upi://pay] scheme.
     *
     * @param payeeVpa  The recipient's UPI VPA (e.g. "example@paytm").
     * @param payeeName Display name of the payee.
     * @param amount    Payment amount as a string (e.g. "100.00").
     * @param note      Transaction note / description.
     * @return A properly encoded [upi://pay] URI string.
     */
    fun buildUpiDeepLink(
        payeeVpa: String,
        payeeName: String,
        amount: String,
        note: String
    ): String {
        val uri = Uri.Builder()
            .scheme("upi")
            .authority("pay")
            .appendQueryParameter("pa", payeeVpa)
            .appendQueryParameter("pn", payeeName)
            .appendQueryParameter("am", amount)
            .appendQueryParameter("tn", note)
            .appendQueryParameter("cu", "INR")
            .build()
        return uri.toString()
    }

    /**
     * Opens a UPI payment flow by launching an [Intent] with [Intent.ACTION_VIEW].
     *
     * Uses the standard [upi://pay] scheme first. If no Activity can handle it,
     * falls back to Google Pay's [tez://upi/pay] scheme.
     *
     * @param context   A [Context] used to start the activity.
     * @param payeeVpa  The recipient's UPI VPA (e.g. "example@paytm").
     * @param payeeName Display name of the payee.
     * @param amount    Payment amount (e.g. "100.00").
     * @param note      Transaction note.
     */
    fun openUpiPayment(
        context: Context,
        payeeVpa: String,
        payeeName: String,
        amount: String,
        note: String
    ) {
        val upiDeepLink = buildUpiDeepLink(payeeVpa, payeeName, amount, note)
        val upiIntent = Intent(Intent.ACTION_VIEW, Uri.parse(upiDeepLink))

        // Try the standard upi://pay scheme first
        if (upiIntent.resolveActivity(context.packageManager) != null) {
            context.startActivity(upiIntent)
            return
        }

        // Fallback to Google Pay's tez:// scheme
        val tezUri = Uri.Builder()
            .scheme("tez")
            .authority("upi/pay")
            .appendQueryParameter("pa", payeeVpa)
            .appendQueryParameter("pn", payeeName)
            .appendQueryParameter("am", amount)
            .appendQueryParameter("tn", note)
            .appendQueryParameter("cu", "INR")
            .build()
        val tezIntent = Intent(Intent.ACTION_VIEW, tezUri)

        if (tezIntent.resolveActivity(context.packageManager) != null) {
            context.startActivity(tezIntent)
            return
        }

        // Last-resort: try the upi intent anyway (some launchers will show a chooser)
        context.startActivity(upiIntent)
    }
}
