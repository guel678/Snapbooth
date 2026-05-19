package com.derit.snapbooth.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.derit.snapbooth.editor.PhotoFilter
import com.derit.snapbooth.editor.PhotoStripState
import com.derit.snapbooth.ui.components.PhotoStripPreview
import com.derit.snapbooth.ui.components.PrimaryActionButton
import com.derit.snapbooth.ui.components.SecondaryActionButton

@Composable
fun EditorScreen(
    stripState: PhotoStripState,
    onBack: () -> Unit,
    onStartOver: () -> Unit,
    onCaptionChange: (String) -> Unit,
    onFrameCountChange: (Int) -> Unit,
    onFilterChange: (PhotoFilter) -> Unit,
) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Editor",
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.headlineMedium,
                )
                SecondaryActionButton(text = "Camera", onClick = onBack)
            }

            PhotoStripPreview(
                stripState = stripState,
                modifier = Modifier
                    .widthIn(max = 360.dp)
                    .fillMaxWidth(),
            )

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Frames: ${stripState.frameCount}",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium,
                )
                Slider(
                    value = stripState.frameCount.toFloat(),
                    onValueChange = { onFrameCountChange(it.toInt()) },
                    valueRange = 1f..4f,
                    steps = 2,
                )
            }

            OutlinedTextField(
                value = stripState.caption,
                onValueChange = onCaptionChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Caption") },
                singleLine = true,
                shape = MaterialTheme.shapes.medium,
            )

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Filter",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium,
                )
                PhotoFilter.entries.chunked(2).forEach { rowFilters ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        rowFilters.forEach { filter ->
                            FilterChip(
                                selected = stripState.filter == filter,
                                onClick = { onFilterChange(filter) },
                                label = { Text(filter.label) },
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PrimaryActionButton(
                    text = "Export Soon",
                    onClick = {},
                    modifier = Modifier.weight(1f),
                )
                SecondaryActionButton(
                    text = "Start Over",
                    onClick = onStartOver,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
