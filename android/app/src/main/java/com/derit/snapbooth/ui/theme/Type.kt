package com.derit.snapbooth.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val SnapTypography = Typography(
    displayLarge = Typography().displayLarge.copy(
        fontFamily = FontFamily.SansSerif,
        fontSize = 48.sp,
        lineHeight = 52.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 0.sp,
    ),
    headlineMedium = Typography().headlineMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        letterSpacing = 0.sp,
    ),
    titleMedium = Typography().titleMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.sp,
    ),
    bodyLarge = Typography().bodyLarge.copy(
        fontFamily = FontFamily.SansSerif,
        lineHeight = 24.sp,
        letterSpacing = 0.sp,
    ),
    labelLarge = Typography().labelLarge.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.sp,
    ),
)
