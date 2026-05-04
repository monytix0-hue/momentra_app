package app.momentra.ui.home

import android.annotation.SuppressLint
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.momentra.ui.theme.DesignTokens
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

@Composable
fun InviteQrScannerDialog(
    onDismiss: () -> Unit,
    onBarcode: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val scanner = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build(),
        )
    }
    val lastPayload = remember { AtomicReference<String?>(null) }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
            scanner.close()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.base.bg),
        ) {
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx)
                    val mainExecutor = ContextCompat.getMainExecutor(ctx)
                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener(
                        {
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.surfaceProvider = previewView.surfaceProvider
                            }
                            val analysis = ImageAnalysis.Builder()
                                .setTargetResolution(Size(1280, 720))
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()
                            analysis.setAnalyzer(cameraExecutor) { imageProxy: ImageProxy ->
                                processFrame(
                                    imageProxy = imageProxy,
                                    scanner = scanner,
                                    lastPayload = lastPayload,
                                    mainExecutor = mainExecutor,
                                    onBarcode = onBarcode,
                                )
                            }
                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_BACK_CAMERA,
                                    preview,
                                    analysis,
                                )
                            } catch (_: Exception) {
                                // Camera unavailable; user can close
                            }
                        },
                        ContextCompat.getMainExecutor(ctx),
                    )
                    previewView
                },
                modifier = Modifier.fillMaxSize(),
            )
            TextButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(DesignTokens.spacing.section),
            ) {
                Text("Close", color = DesignTokens.base.onDark, style = DesignTokens.type.bodyMedium)
            }
            Text(
                "Point at an invite QR code",
                color = DesignTokens.base.onDark,
                style = DesignTokens.type.caption,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(DesignTokens.spacing.screenV + DesignTokens.spacing.item),
            )
        }
    }
}

@SuppressLint("UnsafeOptInUsageError")
private fun processFrame(
    imageProxy: ImageProxy,
    scanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    lastPayload: AtomicReference<String?>,
    mainExecutor: java.util.concurrent.Executor,
    onBarcode: (String) -> Unit,
) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) {
        imageProxy.close()
        return
    }
    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    scanner.process(image)
        .addOnSuccessListener { codes ->
            val raw = codes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue ?: return@addOnSuccessListener
            val prev = lastPayload.getAndSet(raw)
            if (prev == raw) return@addOnSuccessListener
            mainExecutor.execute { onBarcode(raw) }
        }
        .addOnCompleteListener { imageProxy.close() }
}
