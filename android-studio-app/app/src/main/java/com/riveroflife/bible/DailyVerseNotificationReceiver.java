package com.riveroflife.bible;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;

import java.util.Calendar;

public class DailyVerseNotificationReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "daily_bible_verse_channel";
    public static final String PREFS_NAME = "rol_notification_prefs";
    public static final String KEY_ENABLED = "morning_reminder_enabled";
    public static final String KEY_HOUR = "morning_reminder_hour";
    public static final String KEY_MINUTE = "morning_reminder_minute";
    public static final int NOTIFICATION_ID = 1001;
    public static final int ALARM_REQUEST_CODE = 2001;

    @Override
    public void onReceive(Context context, Intent intent) {
        SharedPreferences widgetPrefs = context.getSharedPreferences(VerseWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String verseText = widgetPrefs.getString(VerseWidgetProvider.KEY_VERSE_TEXT, 
            "परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही. तो मला हिरव्या कुरणात बसवतो, तो मला शांत पाण्याच्या काठी नेतो.");
        String verseRef = widgetPrefs.getString(VerseWidgetProvider.KEY_VERSE_REF, "स्तोत्रसंहिता २३:१");

        showNotification(context, verseText, verseRef);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_ENABLED, true);
        int hour = prefs.getInt(KEY_HOUR, 7);
        int minute = prefs.getInt(KEY_MINUTE, 0);
        if (enabled) {
            scheduleDailyMorningAlarm(context, hour, minute, true);
        }
    }

    public static void showNotification(Context context, String verseText, String verseRef) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Daily Bible Verse / दैनिक वचन",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Daily morning scripture verse notification / दररोज सकाळचे आत्मिक वचन");
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("📖 आजचे दैनिक वचन • River of Life")
                .setContentText(verseRef + ": \"" + verseText + "\"")
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText("\"" + verseText + "\"\n\n— " + verseRef)
                        .setSummaryText("दैनिक वचन • Verse of the Day"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }

    public static void scheduleDailyMorningAlarm(Context context, int hour, int minute, boolean enabled) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_ENABLED, enabled)
                .putInt(KEY_HOUR, hour)
                .putInt(KEY_MINUTE, minute)
                .apply();

        Intent intent = new Intent(context, DailyVerseNotificationReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        if (!enabled) {
            alarmManager.cancel(pendingIntent);
            return;
        }

        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }

        long triggerAtMillis = calendar.getTimeInMillis();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        }
    }
}
