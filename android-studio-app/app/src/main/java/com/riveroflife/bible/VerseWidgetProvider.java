package com.riveroflife.bible;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class VerseWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "rol_verse_widget";
    public static final String KEY_VERSE_TEXT = "daily_verse_text";
    public static final String KEY_VERSE_REF = "daily_verse_ref";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String verseText = prefs.getString(KEY_VERSE_TEXT, "परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही. तो मला हिरव्या कुरणात बसवतो, तो मला शांत पाण्याच्या काठी नेतो.");
        String verseRef = prefs.getString(KEY_VERSE_REF, "— स्तोत्रसंहिता २३:१-२");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_verse_layout);
        views.setTextViewText(R.id.widget_verse_text, "\"" + verseText + "\"");
        views.setTextViewText(R.id.widget_verse_ref, verseRef);

        // Tap widget to launch app directly
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        views.setOnClickPendingIntent(R.id.widget_root_layout, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateWidgetData(Context context, String verseText, String verseRef) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(KEY_VERSE_TEXT, verseText)
                .putString(KEY_VERSE_REF, verseRef)
                .apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, VerseWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
        }
    }
}
