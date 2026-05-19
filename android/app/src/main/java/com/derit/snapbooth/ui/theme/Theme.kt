package com.derit.snapbooth.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = SnapAccent,
    onPrimary = SnapControl,
    secondary = SnapWarm,
    onSecondary = SnapInk,
    background = SnapCanvas,
    onBackground = SnapInk,
    surface = SnapSurface,
    onSurface = SnapInk,
    surfaceVariant = SnapControl,
    onSurfaceVariant = SnapMuted,
    outline = SnapLine,
)

@Composable
fun SnapBoothTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = SnapTypography,
        content = content,
    )
}
