import WidgetKit
import SwiftUI

// MARK: - App Group Configuration
// Shared container identifier between Main App and Widget Extension
let appGroupId = "group.com.riveroflife.bible"

// MARK: - Timeline Entry
struct VerseEntry: TimelineEntry {
    let date: Date
    let verseText: String
    let verseRef: String
}

// MARK: - Timeline Provider
struct VerseTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> VerseEntry {
        VerseEntry(
            date: Date(),
            verseText: "परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही.",
            verseRef: "स्तोत्रसंहिता २३:१"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
        let entry = fetchLatestVerse()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
        let entry = fetchLatestVerse()
        // Refresh every 6 hours or at midnight
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date().addingTimeInterval(21600)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func fetchLatestVerse() -> VerseEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let text = defaults?.string(forKey: "daily_verse_text") ?? "परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही. तो मला हिरव्या कुरणात बसवतो."
        let ref = defaults?.string(forKey: "daily_verse_ref") ?? "स्तोत्रसंहिता २३:१-२"
        return VerseEntry(date: Date(), verseText: text, verseRef: ref)
    }
}

// MARK: - Widget SwiftUI View
struct VerseWidgetEntryView: View {
    var entry: VerseTimelineProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Background gradient matching River of Life theme
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 15/255, green: 23/255, blue: 42/255),
                    Color(red: 30/255, green: 41/255, blue: 59/255)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 6) {
                // Header badge
                HStack {
                    Text("🕊️")
                        .font(.system(size: 11))
                    Text("RIVER OF LIFE • रोजचे वचन")
                        .font(.system(size: 9, weight: .heavy, design: .rounded))
                        .foregroundColor(Color(red: 245/255, green: 158/255, blue: 11/255))
                        .tracking(0.5)
                    Spacer()
                    Text("TODAY")
                        .font(.system(size: 8, weight: .bold))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color(red: 34/255, green: 197/255, blue: 94/255))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                }

                Spacer(minLength: 2)

                // Verse Quote
                Text("\"\(entry.verseText)\"")
                    .font(.system(size: family == .systemSmall ? 11 : 13, weight: .medium, design: .serif))
                    .foregroundColor(Color(red: 248/255, green: 250/255, blue: 252/255))
                    .italic()
                    .lineLimit(family == .systemSmall ? 4 : 5)
                    .lineSpacing(2)

                Spacer(minLength: 2)

                // Reference
                HStack {
                    Spacer()
                    Text("— \(entry.verseRef)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 148/255, green: 163/255, blue: 184/255))
                }
            }
            .padding(14)
        }
    }
}

// MARK: - Widget Configuration
@main
struct VerseWidget: Widget {
    let kind: String = "VerseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VerseTimelineProvider()) { entry in
            VerseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Verse of the Day")
        .description("Daily inspiring Bible scripture from River of Life.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
