package com.creatifit.ai.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configurar el status bar y safe area
        setupStatusBar();
    }
    
    private void setupStatusBar() {
        // Configurar el sistema de ventanas para manejar el safe area
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Configurar el controlador de insets
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        
        // Mostrar el status bar
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
        
        // Configurar el color del status bar
        getWindow().setStatusBarColor(getResources().getColor(R.color.colorPrimary, null));
        getWindow().setNavigationBarColor(getResources().getColor(R.color.colorPrimary, null));

        // C-UX-9 / B3 — NO aplicar FLAG_LAYOUT_NO_LIMITS: choca con
        // setDecorFitsSystemWindows(false) y el plugin SafeArea, e impide que
        // adjustResize desplace el contenido al abrir el teclado. El edge-to-edge
        // lo gestiona WindowCompat.setDecorFitsSystemWindows + el plugin SafeArea.
    }
}
