package app.momentra

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import app.momentra.data.AuthRepository
import app.momentra.data.MomentraPrefs
import app.momentra.navigation.MomentraApp
import app.momentra.network.createMomentraApi
import com.google.firebase.auth.FirebaseAuth

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val prefs = MomentraPrefs(applicationContext)
        val api = createMomentraApi(BuildConfig.API_BASE_URL)
        val authRepository = AuthRepository(FirebaseAuth.getInstance(), api)
        setContent {
            MomentraApp(
                authRepository = authRepository,
                prefs = prefs,
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }
}
