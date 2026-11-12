package com.wevsoft.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Best-effort ~24h due flag for Contact Discovery (JS performs the actual sync when active).
    ContactDiscoveryScheduler.ensureScheduled(this);
  }
}
