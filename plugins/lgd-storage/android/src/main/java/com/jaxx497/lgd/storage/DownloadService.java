package com.jaxx497.lgd.storage;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

// Keeps the process alive while downloads run: the transfer itself (StoragePlugin.download) happens
// in the app process, so without a foreground service Android kills it soon after the app leaves
// the screen. The notification doubles as the progress bar. The CPU and Wi-Fi locks stop the device sleeping
// mid-download (best effort: newer Android limits the Wi-Fi lock to when the screen is on).
public class DownloadService extends Service {

    static final int ID = 1;
    // The download thread updates the notification only while this is true, so a late update can't
    // leave an orphan notification behind after the service stops.
    static volatile boolean running;
    private static final String CHANNEL = "downloads";

    private PowerManager.WakeLock wake;
    private WifiManager.WifiLock wifi;

    static Notification build(Context context, String text, int percent) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                new NotificationChannel(CHANNEL, "Downloads", NotificationManager.IMPORTANCE_LOW)
            );
        }
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent open = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("LibgenDL")
            .setContentText(text)
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setProgress(100, Math.max(percent, 0), percent < 0)
            .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        running = true;
        Notification notification = build(this, intent.getStringExtra("text"), intent.getIntExtra("percent", -1));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(ID, notification);
        }

        if (wake == null) {
            wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lgd:download");
            wake.acquire(2 * 60 * 60 * 1000L); // ponytail: 2 h cap so a stuck queue can't hold the CPU forever
            wifi = ((WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE))
                .createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "lgd:download");
            wifi.acquire();
        }
        return START_NOT_STICKY; // the transfer dies with the process; restarting the service wouldn't resume it
    }

    @Override
    public void onDestroy() {
        running = false;
        if (wake != null && wake.isHeld()) {
            wake.release();
        }
        if (wifi != null && wifi.isHeld()) {
            wifi.release();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
