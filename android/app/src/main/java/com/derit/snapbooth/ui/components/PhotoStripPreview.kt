package com.derit.snapbooth.ui.components

import android.graphics.BitmapFactory
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.Image
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.derit.snapbooth.editor.PhotoStripState

@Composable
fun PhotoStripPreview(
    stripState: PhotoStripState,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        repeat(stripState.frameCount) { index ->
            PhotoFrame(
                label = if (index < stripState.photoCount) "Captured" else "Frame ${index + 1}",
                filled = index < stripState.photoCount,
                photoUri = stripState.photoUris.getOrNull(index),
            )
        }

        if (stripState.caption.isNotBlank()) {
            Text(
                text = stripState.caption,
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}

@Composable
private fun PhotoFrame(
    label: String,
    filled: Boolean,
    photoUri: String?,
) {
    val background = if (filled) Color(0xFFE6F0EE) else Color(0xFFF7F5F0)
    val border = if (filled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    val context = LocalContext.current
    val imageBitmap = remember(photoUri) {
        photoUri?.let { uri ->
            runCatching {
                context.contentResolver.openInputStream(uri.toUri())?.use { input ->
                    BitmapFactory.decodeStream(input)?.asImageBitmap()
                }
            }.getOrNull()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(4f / 3f)
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .border(1.dp, border, RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        if (imageBitmap != null) {
            Image(
                bitmap = imageBitmap,
                contentDescription = label,
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Text(
                text = label,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}
