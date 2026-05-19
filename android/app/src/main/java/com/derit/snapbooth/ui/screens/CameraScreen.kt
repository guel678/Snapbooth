package com.derit.snapbooth.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.derit.snapbooth.ui.components.PrimaryActionButton
import com.derit.snapbooth.ui.components.SecondaryActionButton
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@Composable
fun CameraScreen(
    capturedCount: Int,
    maxPhotos: Int,
    onBack: () -> Unit,
    onPhotoCaptured: (String) -> Unit,
    onOpenEditor: () -> Unit,
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasCameraPermission = granted
    }
    val imageCapture = remember { ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build() }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    var captureError by remember { mutableStateOf<String?>(null) }
    var isCapturing by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    Surface(color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Camera",
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.headlineMedium,
                )
                SecondaryActionButton(text = "Back", onClick = onBack)
            }

            Box(
                modifier = Modifier
                    .widthIn(max = 760.dp)
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center,
            ) {
                if (hasCameraPermission) {
                    CameraPreview(imageCapture = imageCapture)
                    CaptureStatus(
                        capturedCount = capturedCount,
                        maxPhotos = maxPhotos,
                        isCapturing = isCapturing,
                    )
                } else {
                    Column(
                        modifier = Modifier.padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Camera permission is needed",
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.ExtraBold,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            text = "Allow camera access to capture photo strip frames.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                }
            }

            captureError?.let { message ->
                Text(
                    text = message,
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PrimaryActionButton(
                    text = when {
                        capturedCount >= maxPhotos -> "Review Strip"
                        isCapturing -> "Capturing..."
                        else -> "Capture Frame"
                    },
                    onClick = {
                        if (capturedCount >= maxPhotos) {
                            onOpenEditor()
                            return@PrimaryActionButton
                        }
                        if (!hasCameraPermission) {
                            permissionLauncher.launch(Manifest.permission.CAMERA)
                            return@PrimaryActionButton
                        }
                        captureError = null
                        isCapturing = true
                        capturePhoto(
                            context = context,
                            imageCapture = imageCapture,
                            executor = cameraExecutor,
                            onSuccess = { uri ->
                                isCapturing = false
                                onPhotoCaptured(uri)
                            },
                            onError = { error ->
                                isCapturing = false
                                captureError = error
                            },
                        )
                    },
                    modifier = Modifier.weight(1f),
                )
                SecondaryActionButton(
                    text = "Editor",
                    onClick = onOpenEditor,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun CameraPreview(imageCapture: ImageCapture) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }

    AndroidView(
        factory = { previewView },
        modifier = Modifier.fillMaxSize(),
    )

    DisposableEffect(lifecycleOwner, previewView, imageCapture) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        val listener = Runnable {
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner,
                CameraSelector.DEFAULT_FRONT_CAMERA,
                preview,
                imageCapture,
            )
        }

        cameraProviderFuture.addListener(listener, ContextCompat.getMainExecutor(context))

        onDispose {
            cameraProviderFuture.get().unbindAll()
        }
    }
}

@Composable
private fun CaptureStatus(
    capturedCount: Int,
    maxPhotos: Int,
    isCapturing: Boolean,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(18.dp),
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = "$capturedCount / $maxPhotos",
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.Black,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.88f))
                .padding(horizontal = 14.dp, vertical = 8.dp),
        )

        if (isCapturing) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    }
}

private fun capturePhoto(
    context: Context,
    imageCapture: ImageCapture,
    executor: ExecutorService,
    onSuccess: (String) -> Unit,
    onError: (String) -> Unit,
) {
    val photoFile = createPhotoFile(context)
    val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

    imageCapture.takePicture(
        outputOptions,
        executor,
        object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                val uri = outputFileResults.savedUri ?: android.net.Uri.fromFile(photoFile)
                ContextCompat.getMainExecutor(context).execute {
                    onSuccess(uri.toString())
                }
            }

            override fun onError(exception: ImageCaptureException) {
                ContextCompat.getMainExecutor(context).execute {
                    onError(exception.message ?: "Could not capture the photo. Please try again.")
                }
            }
        },
    )
}

private fun createPhotoFile(context: Context): File {
    val timestamp = SimpleDateFormat("yyyyMMdd-HHmmss-SSS", Locale.US).format(System.currentTimeMillis())
    val directory = File(context.filesDir, "snapbooth-captures").apply {
        mkdirs()
    }

    return File(directory, "snapbooth-$timestamp.jpg")
}
