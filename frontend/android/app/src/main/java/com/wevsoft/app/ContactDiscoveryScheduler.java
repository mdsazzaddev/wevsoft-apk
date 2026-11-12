package com.wevsoft.app;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/** Schedules a ~24h Contact Discovery due-flag worker (best-effort). */
public final class ContactDiscoveryScheduler {
  public static final String UNIQUE_WORK = "wevsoft_contact_discovery_periodic";

  private ContactDiscoveryScheduler() {}

  public static void ensureScheduled(Context context) {
    Constraints constraints = new Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build();

    // Minimum periodic interval for WorkManager is 15 minutes; we use 24h as product target.
    PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            ContactDiscoverySyncWorker.class,
            24,
            TimeUnit.HOURS)
        .setConstraints(constraints)
        .build();

    WorkManager.getInstance(context.getApplicationContext())
        .enqueueUniquePeriodicWork(UNIQUE_WORK, ExistingPeriodicWorkPolicy.KEEP, request);
  }

  public static void cancel(Context context) {
    WorkManager.getInstance(context.getApplicationContext()).cancelUniqueWork(UNIQUE_WORK);
  }
}
