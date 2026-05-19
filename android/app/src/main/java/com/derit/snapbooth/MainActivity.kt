package com.derit.snapbooth

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.derit.snapbooth.ui.SnapBoothApp
import com.derit.snapbooth.ui.theme.SnapBoothTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        setContent {
            SnapBoothTheme {
                SnapBoothApp()
            }
        }
    }
}
