package com.derit.snapbooth.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.derit.snapbooth.ui.components.ActionButtonStack

@Composable
fun LandingScreen(
    onOpenCamera: () -> Unit,
    onOpenEditor: () -> Unit,
) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 28.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 460.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "SnapBooth",
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.Black,
                        style = MaterialTheme.typography.displayLarge,
                    )
                    Text(
                        text = "Build a clean photo strip from captured shots, edited frames, and a short caption.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }

                Spacer(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(MaterialTheme.colorScheme.outline)
                )

                ActionButtonStack(
                    primaryText = "Open Camera",
                    onPrimaryClick = onOpenCamera,
                    secondaryText = "Preview Editor",
                    onSecondaryClick = onOpenEditor,
                )
            }
        }
    }
}
