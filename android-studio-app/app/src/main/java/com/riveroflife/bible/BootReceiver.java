package com.riveroflife.bible;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || 
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences(DailyVerseNotificationReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean(DailyVerseNotificationReceiver.KEY_ENABLED, true);
            int hour = prefs.getInt(DailyVerseNotificationReceiver.KEY_HOUR, 7);
            int minute = prefs.getInt(DailyVerseNotificationReceiver.KEY_MINUTE, 0);
            if (enabled) {
                DailyVerseNotificationReceiver.scheduleDailyMorningAlarm(context, hour, minute, true);
            }
        }
    }
}
