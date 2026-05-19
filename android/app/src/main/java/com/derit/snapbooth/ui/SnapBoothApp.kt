package com.derit.snapbooth.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import com.derit.snapbooth.editor.PhotoFilter
import com.derit.snapbooth.editor.PhotoStripState
import com.derit.snapbooth.ui.screens.CameraScreen
import com.derit.snapbooth.ui.screens.EditorScreen
import com.derit.snapbooth.ui.screens.LandingScreen

private enum class SnapBoothScreen {
    Landing,
    Camera,
    Editor,
}

@Composable
fun SnapBoothApp() {
    var screen by rememberSaveable { mutableStateOf(SnapBoothScreen.Landing) }
    var stripState by remember {
        mutableStateOf(
            PhotoStripState(
                frameCount = 4,
                filter = PhotoFilter.None,
                caption = "Summer 2025",
            )
        )
    }

    when (screen) {
        SnapBoothScreen.Landing -> LandingScreen(
            onOpenCamera = { screen = SnapBoothScreen.Camera },
            onOpenEditor = { screen = SnapBoothScreen.Editor },
        )

        SnapBoothScreen.Camera -> CameraScreen(
            capturedCount = stripState.photoCount,
            maxPhotos = stripState.frameCount,
            onBack = { screen = SnapBoothScreen.Landing },
            onPhotoCaptured = { uri ->
                val nextStripState = stripState.addPhoto(uri)
                stripState = nextStripState
                if (nextStripState.photoCount >= nextStripState.frameCount) {
                    screen = SnapBoothScreen.Editor
                }
            },
            onOpenEditor = { screen = SnapBoothScreen.Editor },
        )

        SnapBoothScreen.Editor -> EditorScreen(
            stripState = stripState,
            onBack = { screen = SnapBoothScreen.Camera },
            onStartOver = {
                stripState = stripState.clearPhotos()
                screen = SnapBoothScreen.Landing
            },
            onCaptionChange = { stripState = stripState.copy(caption = it) },
            onFrameCountChange = { stripState = stripState.copy(frameCount = it.coerceIn(1, 4)) },
            onFilterChange = { stripState = stripState.copy(filter = it) },
        )
    }
}
