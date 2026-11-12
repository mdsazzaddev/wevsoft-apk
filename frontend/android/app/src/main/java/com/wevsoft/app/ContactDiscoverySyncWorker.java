package com.wevsoft.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Best-effort Contact Discovery tick. Does NOT upload contacts from the background
 * (Play / privacy: matching runs in the WebView after user consent when the app is active).
 * Sets a SharedPreferences flag that the JS bridge / App-resume hook can honor.
 *
 * Timing is not guaranteed — Android may defer WorkManager under battery/network constraints.
 */
public class ContactDiscoverySyncWorker extends Worker {
  public static final String PREFS = "wevsoft_contact_discovery";
  public static final String KEY_DUE = "sync_due";
  public static final String KEY_TICK_AT = "worker_tick_at";

  public ContactDiscoverySyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull
  @Override
  public Result doWork() {
    SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    prefs.edit()
        .putBoolean(KEY_DUE, true)
        .putLong(KEY_TICK_AT, System.currentTimeMillis())
        .apply();
    return Result.success();
  }
}
