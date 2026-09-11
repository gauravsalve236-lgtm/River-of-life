# River of Life - iOS Verse of the Day Widget Extension

This folder contains the complete SwiftUI WidgetKit extension for the **River of Life: Holy Bible** app.

## How to Integrate in Xcode:
1. In Xcode, open `RiverOfLife.xcodeproj`.
2. Go to **File > New > Target...** and select **Widget Extension**.
3. Name the product: `VerseWidgetExtension` and ensure **Include Configuration Intent** is unchecked.
4. Replace the generated `VerseWidget.swift` with `ios/VerseWidgetExtension/VerseWidget.swift`.
5. Under **Signing & Capabilities** for both the main app target and `VerseWidgetExtension`, add the **App Groups** capability and check `group.com.riveroflife.bible`.
6. In your main iOS app's WKWebView script message handler (e.g. `userContentController(_:didReceive:)`), save the incoming daily verse into the shared `UserDefaults`:
   ```swift
   if let sharedDefaults = UserDefaults(suiteName: "group.com.riveroflife.bible") {
       sharedDefaults.set(verseText, forKey: "daily_verse_text")
       sharedDefaults.set(verseRef, forKey: "daily_verse_ref")
       WidgetCenter.shared.reloadAllTimelines()
   }
   ```
