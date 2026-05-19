package com.derit.snapbooth.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun PrimaryActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
    ) {
        Text(text = text)
    }
}

@Composable
fun SecondaryActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Text(text = text)
    }
}

@Composable
fun ActionButtonStack(
    primaryText: String,
    onPrimaryClick: () -> Unit,
    secondaryText: String,
    onSecondaryClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        PrimaryActionButton(text = primaryText, onClick = onPrimaryClick)
        SecondaryActionButton(text = secondaryText, onClick = onSecondaryClick)
    }
}
