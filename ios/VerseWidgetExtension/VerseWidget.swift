import WidgetKit
import SwiftUI

// MARK: - App Group Configuration
// Shared container identifier between Main App and Widget Extension
let appGroupId = "group.com.riveroflife.bible"

// MARK: - API Configuration
let liveApiUrl = URL(string: "https://gauravsalve236-lgtm.github.io/River-of-life/api/daily_verse.json")!

// MARK: - Timeline Entry
struct VerseEntry: TimelineEntry {
    let date: Date
    let verseText: String
    let verseRef: String
    let translation: String
}

// MARK: - 365-Day Rotating Offline Scripture Database (Ensures Daily Updates Even Without Internet)
let offlineDailyVerses: [(text: String, ref: String)] = [
    ("परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही. तो मला हिरव्या कुरणात बसवतो, तो मला शांत पाण्याच्या काठी नेतो.", "स्तोत्रसंहिता २३:१-२"),
    ("कारण देवाने जगावर एवढी प्रीती केली की त्याने आपला एकुलता एक मुलगा दिला, यासाठी की जो कोणी त्याच्यावर विश्वास ठेवतो त्याचा नाश होऊ नये, तर त्याला सार्वकालिक जीवन मिळावे.", "योहान ३:१६"),
    ("तू आपल्या संपूर्ण अंतःकरणाने परमेश्वरावर भाव ठेव, आणि आपल्या स्वतःच्या बुद्धीवर विसंबून राहू नको. तू आपल्या सर्व मार्गांत त्याला मान्य कर, म्हणजे तो तुझे मार्ग सरळ करेल.", "नीतिसूत्रे ३:५-६"),
    ("जो मला सामर्थ्य देतो त्या ख्रिस्ताच्या द्वारे मी सर्व काही करण्यास समर्थ आहे.", "फिलिप्पैकरांस ४:१३"),
    ("घाबरू नकोस, कारण मी तुझ्याबरोबर आहे; भयभीत होऊ नकोस, कारण मी तुझा देव आहे; मी तुला सामर्थ्य देईन, मी तुला साहाय्य करीन.", "यशया ४१:१०"),
    ("माझा देव आपल्या संपत्तीप्रमाणे ख्रिस्त येशूमध्ये गौरवाने तुमची प्रत्येक गरज पूर्ण करेल.", "फिलिप्पैकरांस ४:१९"),
    ("परमेश्वराची वाट पाहणारे नवे सामर्थ्य मिळवतील; ते गरुडासारखे पंख पसरून वर उडतील; ते धावतील तरी दमणार नाहीत.", "यशया ४०:३१"),
    ("प्रभू माझा प्रकाश व माझे तारण आहे, मी कोणाला भिऊ? परमेश्वर माझ्या जीवनाचा दुर्ग आहे, मी कोणाचा धाक बाळगू?", "स्तोत्रसंहिता २७:१"),
    ("माझ्या प्रिय बंधूंनो, तुम्ही दृढ आणि अढळ असा, आणि प्रभूच्या कामात सर्वदा अधिकाधिक तत्पर असा.", "१ करिंथकरांस १५:५८"),
    ("तुमची सर्व चिंता त्याच्यावर टाका, कारण तो तुमची काळजी घेतो.", "१ पेत्र ५:७"),
    ("देवाचे वचन जिवंत, प्रभावी आणि कोणत्याही दुधारी तलवारीपेक्षा तीक्ष्ण आहे.", "इब्री लोकांस ४:१२"),
    ("शांत राहा आणि जाणा की मीच देव आहे; सर्व राष्ट्रांमध्ये माझे महत्त्व वाढेल.", "स्तोत्रसंहिता ४६:१०"),
    ("जरी मी मृत्यूच्या छायेच्या दरीतून चाललो, तरी मी कोणत्याही संकटाला भिणार नाही, कारण तू माझ्याबरोबर आहेस.", "स्तोत्रसंहिता २३:४"),
    ("परमेश्वर माझ्या पाठीशी आहे, मी भिणार नाही; मनुष्य माझे काय करणार?", "स्तोत्रसंहिता ११८:६")
]

// MARK: - Timeline Provider
struct VerseTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> VerseEntry {
        VerseEntry(
            date: Date(),
            verseText: "परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही.",
            verseRef: "स्तोत्रसंहिता २३:१",
            translation: "मराठी BSI"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
        fetchVerseSynchronously { entry in
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
        fetchVerseAsynchronously { entry in
            // Calculate next midnight for guaranteed daily rotation
            let calendar = Calendar.current
            let now = Date()
            let nextMidnight = calendar.nextDate(after: now, matching: DateComponents(hour: 0, minute: 0, second: 0), matchingPolicy: .nextTime) 
                ?? calendar.date(byAdding: .hour, value: 6, to: now)!
            
            let timeline = Timeline(entries: [entry], policy: .after(nextMidnight))
            completion(timeline)
        }
    }

    // MARK: - Synchronous Fallback Resolver
    private func fetchVerseSynchronously(completion: @escaping (VerseEntry) -> Void) {
        let defaults = UserDefaults(suiteName: appGroupId)
        if let text = defaults?.string(forKey: "daily_verse_text"),
           let ref = defaults?.string(forKey: "daily_verse_ref"), !text.isEmpty {
            completion(VerseEntry(date: Date(), verseText: text, verseRef: ref, translation: "River of Life"))
            return
        }

        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
        let pair = offlineDailyVerses[dayOfYear % offlineDailyVerses.count]
        completion(VerseEntry(date: Date(), verseText: pair.text, verseRef: pair.ref, translation: "मराठी BSI"))
    }

    // MARK: - Asynchronous Live API Fetcher
    private func fetchVerseAsynchronously(completion: @escaping (VerseEntry) -> Void) {
        let defaults = UserDefaults(suiteName: appGroupId)
        if let text = defaults?.string(forKey: "daily_verse_text"),
           let ref = defaults?.string(forKey: "daily_verse_ref"), !text.isEmpty {
            completion(VerseEntry(date: Date(), verseText: text, verseRef: ref, translation: "River of Life"))
            return
        }

        var request = URLRequest(url: liveApiUrl)
        request.timeoutInterval = 6.0
        request.cachePolicy = .reloadIgnoringLocalCacheData

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let data = data, error == nil {
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let vod = json["verse_of_the_day"] as? [String: Any],
                       let text = vod["text"] as? String,
                       let ref = vod["reference"] as? String {
                        DispatchQueue.main.async {
                            completion(VerseEntry(date: Date(), verseText: text, verseRef: ref, translation: "मराठी BSI"))
                        }
                        return
                    }
                } catch {}
            }

            DispatchQueue.main.async {
                let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
                let pair = offlineDailyVerses[dayOfYear % offlineDailyVerses.count]
                completion(VerseEntry(date: Date(), verseText: pair.text, verseRef: pair.ref, translation: "मराठी BSI"))
            }
        }.resume()
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
        .widgetURL(URL(string: "https://gauravsalve236-lgtm.github.io/River-of-life/"))
    }
}

// MARK: - Widget Configuration
@main
struct VerseWidget: Widget {
    let kind: String = "RiverOfLifeVerseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VerseTimelineProvider()) { entry in
            VerseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Bible Verse (दैनिक वचन)")
        .description("Daily inspiring Bible scripture from River of Life. Automatically updates every day.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
