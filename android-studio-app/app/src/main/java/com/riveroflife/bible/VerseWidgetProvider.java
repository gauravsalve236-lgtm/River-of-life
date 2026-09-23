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

    private static final String[][] DAILY_VERSES = {
        {"परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही. तो मला हिरव्या कुरणात बसवतो, तो मला शांत पाण्याच्या काठी नेतो.", "स्तोत्रसंहिता २३:१-२"},
        {"कारण देवाने जगावर एवढी प्रीती केली की त्याने आपला एकुलता एक मुलगा दिला, यासाठी की जो कोणी त्याच्यावर विश्वास ठेवतो त्याचा नाश होऊ नये, तर त्याला सार्वकालिक जीवन मिळावे.", "योहान ३:१६"},
        {"तू आपल्या संपूर्ण अंतःकरणाने परमेश्वरावर भाव ठेव, आणि आपल्या स्वतःच्या बुद्धीवर विसंबून राहू नको.", "नीतिसूत्रे ३:५"},
        {"जो मला सामर्थ्य देतो त्या ख्रिस्ताच्या द्वारे मी सर्व काही करण्यास समर्थ आहे.", "फिलिप्पैकरांस ४:१३"},
        {"घाबरू नकोस, कारण मी तुझ्याबरोबर आहे; भयभीत होऊ नकोस, कारण मी तुझा देव आहे; मी तुला सामर्थ्य देईन, मी तुला साहाय्य करीन.", "यशया ४१:१०"},
        {"माझा देव आपल्या संपत्तीप्रमाणे ख्रिस्त येशूमध्ये गौरवाने तुमची प्रत्येक गरज पूर्ण करेल.", "फिलिप्पैकरांस ४:१९"},
        {"परमेश्वराची वाट पाहणारे नवे सामर्थ्य मिळवतील; ते गरुडासारखे पंख पसरून वर उडतील.", "यशया ४०:३१"}
    };

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        int dayIdx = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_YEAR) % DAILY_VERSES.length;
        String fallbackText = DAILY_VERSES[dayIdx][0];
        String fallbackRef = "— " + DAILY_VERSES[dayIdx][1];

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String verseText = prefs.getString(KEY_VERSE_TEXT, fallbackText);
        String verseRef = prefs.getString(KEY_VERSE_REF, fallbackRef);

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
