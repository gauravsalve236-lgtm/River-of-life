# River of Life — Native Mobile Widgets Architecture Specification

This specification documents the production architecture for native iOS and Android widgets for the **River of Life** application.

---

## 1. Overview & Strategy

Native mobile widgets on iOS (WidgetKit in Swift/SwiftUI) and Android (App Widgets in Kotlin/Jetpack Glance) run as independent OS processes outside the webview container. 

Therefore, widgets:
- Cannot render raw webview HTML elements.
- Must read structured JSON data from a shared OS storage container.
- Update asynchronously on background timelines or via push triggers.

---

## 2. Shared Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 RIVER OF LIFE CAPACITOR PWA                 │
│  (Webview App: Daily Verse, Prayers, Scheduled Meetings)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Writes JSON via Capacitor Plugin
┌──────────────────────────────▼──────────────────────────────┐
│                  SHARED OS DATA CONTAINER                   │
│  iOS: UserDefaults (App Group: group.com.riveroflife.app)   │
│  Android: SharedPreferences (Shared Preferences Store)      │
└──────────────┬──────────────────────────────┬───────────────┘
               │ Reads JSON                   │ Reads JSON
┌──────────────▼──────────────┐┌──────────────▼──────────────┐
│  iOS WidgetKit (SwiftUI)    ││ Android App Widget (Glance) │
│  Small / Medium / Large     ││ Small / Medium / Large      │
└─────────────────────────────┘└─────────────────────────────┘
```

---

## 3. iOS WidgetKit (Swift & SwiftUI Implementation)

- **Target**: `RiverOfLifeWidgetExtension`
- **App Group Identifier**: `group.com.riveroflife.bibleapp`
- **Widgets Provided**:
  1. `DailyVerseWidget`: Small & Medium widgets displaying today's scripture reference and Marathi/English text.
  2. `PrayerWidget`: Displays current active prayer count and streak.
  3. `NextMeetingWidget`: Displays upcoming scheduled prayer meeting date, time, and quick join trigger link (`riveroflife://meeting/join?id=xxx`).

### Capacitor Bridge Implementation (Swift Plugin):
```swift
import Foundation
import Capacitor
import WidgetKit

@objc(WidgetDataBridgePlugin)
public class WidgetDataBridgePlugin: CAPPlugin {
    @objc func updateDailyVerseWidget(_ call: CAPPluginCall) {
        guard let verseJson = call.getString("verseJson") else {
            call.reject("verseJson missing")
            return
        }
        if let sharedDefaults = UserDefaults(suiteName: "group.com.riveroflife.bibleapp") {
            sharedDefaults.set(verseJson, forKey: "widget_daily_verse")
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            call.resolve(["status": "success"])
        } else {
            call.reject("Failed to access App Group UserDefaults")
        }
    }
}
```

---

## 4. Android App Widget (Jetpack Glance Implementation)

- **Package**: `com.riveroflife.bibleapp.widget`
- **Shared Storage**: `SharedPreferences` named `river_widget_prefs`
- **Glance AppWidget**:
```kotlin
class DailyVerseGlanceWidget : GlanceAppWidget() {
    override async fun provideGlance(context: Context, id: GlanceId) {
        val prefs = context.getSharedPreferences("river_widget_prefs", Context.MODE_PRIVATE)
        val verseText = prefs.getString("verse_text", "Be still, and know that I am God.")
        val verseRef = prefs.getString("verse_ref", "Psalm 46:10")

        provideContent {
            GlanceTheme {
                Column(modifier = GlanceModifier.padding(16.dp).fillMaxSize()) {
                    Text(text = verseText, style = TextStyle(fontWeight = FontWeight.Bold))
                    Text(text = verseRef, style = TextStyle(color = ColorProvider(R.color.teal_600)))
                }
            }
        }
    }
}
```

---

## 5. Automated Data Sync Triggers

When the app fetches a new Daily Verse or loads scheduled meetings from `/api/meetings/scheduled`, the PWA invokes:

```javascript
window.updateNativeWidgetData = function(type, payload) {
  if (window.Capacitor && window.Capacitor.isPluginAvailable("WidgetDataBridge")) {
    window.Capacitor.Plugins.WidgetDataBridge.updateDailyVerseWidget({
      verseJson: JSON.stringify(payload)
    });
  }
};
```
