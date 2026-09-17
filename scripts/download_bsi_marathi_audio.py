import os
import sys
import json
import time
import argparse
import urllib.request
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_DIR = os.path.join(BASE_DIR, "assets", "audio", "bsi")
TOKEN_FILE = os.path.join(BASE_DIR, ".bsi_token.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

CANONICAL_BOOKS = [
    # Old Testament (39 books, 929 chapters)
    ('genesis', 'GEN', 50, 'ot'),
    ('exodus', 'EXO', 40, 'ot'),
    ('leviticus', 'LEV', 27, 'ot'),
    ('numbers', 'NUM', 36, 'ot'),
    ('deuteronomy', 'DEU', 34, 'ot'),
    ('joshua', 'JOS', 24, 'ot'),
    ('judges', 'JDG', 21, 'ot'),
    ('ruth', 'RUT', 4, 'ot'),
    ('1samuel', '1SA', 31, 'ot'),
    ('2samuel', '2SA', 24, 'ot'),
    ('1kings', '1KI', 22, 'ot'),
    ('2kings', '2KI', 25, 'ot'),
    ('1chronicles', '1CH', 29, 'ot'),
    ('2chronicles', '2CH', 36, 'ot'),
    ('ezra', 'EZR', 10, 'ot'),
    ('nehemiah', 'NEH', 13, 'ot'),
    ('esther', 'EST', 10, 'ot'),
    ('job', 'JOB', 42, 'ot'),
    ('psalms', 'PSA', 150, 'ot'),
    ('proverbs', 'PRO', 31, 'ot'),
    ('ecclesiastes', 'ECC', 12, 'ot'),
    ('songofsolomon', 'SNG', 8, 'ot'),
    ('isaiah', 'ISA', 66, 'ot'),
    ('jeremiah', 'JER', 52, 'ot'),
    ('lamentations', 'LAM', 5, 'ot'),
    ('ezekiel', 'EZK', 48, 'ot'),
    ('daniel', 'DAN', 12, 'ot'),
    ('hosea', 'HOS', 14, 'ot'),
    ('joel', 'JOL', 3, 'ot'),
    ('amos', 'AMO', 9, 'ot'),
    ('obadiah', 'OBA', 1, 'ot'),
    ('jonah', 'JON', 4, 'ot'),
    ('micah', 'MIC', 7, 'ot'),
    ('nahum', 'NAM', 3, 'ot'),
    ('habakkuk', 'HAB', 3, 'ot'),
    ('zephaniah', 'ZEP', 3, 'ot'),
    ('haggai', 'HAG', 2, 'ot'),
    ('zechariah', 'ZEC', 14, 'ot'),
    ('malachi', 'MAL', 4, 'ot'),

    # New Testament (27 books, 260 chapters)
    ('matthew', 'MAT', 28, 'nt'),
    ('mark', 'MRK', 16, 'nt'),
    ('luke', 'LUK', 24, 'nt'),
    ('john', 'JHN', 21, 'nt'),
    ('acts', 'ACT', 28, 'nt'),
    ('romans', 'ROM', 16, 'nt'),
    ('1corinthians', '1CO', 16, 'nt'),
    ('2corinthians', '2CO', 13, 'nt'),
    ('galatians', 'GAL', 6, 'nt'),
    ('ephesians', 'EPH', 6, 'nt'),
    ('philippians', 'PHP', 4, 'nt'),
    ('colossians', 'COL', 4, 'nt'),
    ('1thessalonians', '1TH', 5, 'nt'),
    ('2thessalonians', '2TH', 3, 'nt'),
    ('1timothy', '1TI', 6, 'nt'),
    ('2timothy', '2TI', 4, 'nt'),
    ('titus', 'TIT', 3, 'nt'),
    ('philemon', 'PHM', 1, 'nt'),
    ('hebrews', 'HEB', 13, 'nt'),
    ('james', 'JAS', 5, 'nt'),
    ('1peter', '1PE', 5, 'nt'),
    ('2peter', '2PE', 3, 'nt'),
    ('1john', '1JN', 5, 'nt'),
    ('2john', '2JN', 1, 'nt'),
    ('3john', '3JN', 1, 'nt'),
    ('jude', 'JUD', 1, 'nt'),
    ('revelation', 'REV', 22, 'nt')
]

token_lock = threading.Lock()
current_token = None

def get_valid_token(force_refresh=False):
    global current_token
    with token_lock:
        now = int(time.time())
        if not force_refresh and current_token:
            m = current_token.split("Expires=")
            if len(m) > 1:
                try:
                    exp = int(m[1].split("&")[0])
                    if now < (exp - 120):
                        return current_token
                except Exception:
                    pass

        # Try reading from token file if not forced
        if not force_refresh and os.path.exists(TOKEN_FILE):
            try:
                with open(TOKEN_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    tok = data.get("token", "")
                    m = tok.split("Expires=")
                    if len(m) > 1:
                        exp = int(m[1].split("&")[0])
                        if now < (exp - 120):
                            current_token = tok
                            return current_token
            except Exception:
                pass

        # Need live refresh via refresh_bsi_token
        print("\n[Token Manager] Refreshing live CloudFront token from indian.bible...")
        try:
            sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
            from refresh_bsi_token import fetch_live_token, update_files
            new_tok = fetch_live_token()
            if new_tok:
                update_files(new_tok)
                current_token = new_tok
                print(f"[Token Manager] Refreshed successfully: {new_tok[:40]}...\n")
                return current_token
        except Exception as e:
            print(f"[Token Manager] Error refreshing token: {e}")

        return current_token

def download_chapter(item, stats, total_items):
    slug, usfm, ch_num, testament = item
    fname = f"{usfm}_{ch_num:03d}.mp3"
    target_path = os.path.join(TARGET_DIR, fname)
    temp_path = target_path + ".part"

    # Check if already downloaded and valid
    if os.path.exists(target_path):
        size = os.path.getsize(target_path)
        if size > 50000:
            with stats['lock']:
                stats['done'] += 1
                stats['bytes'] += size
                stats['skipped'] += 1
                perc = (stats['done'] / total_items) * 100
                total_mb = stats['bytes'] / (1024 * 1024)
                print(f"[{stats['done']:4d}/{total_items}] ({perc:5.1f}%) [ALREADY SAVED] {fname} ({size/(1024*1024):.2f} MB)")
            return True

    # Download attempts with retry
    for attempt in range(1, 4):
        token = get_valid_token()
        if not token:
            print(f"[ERROR] No valid token available for {fname}")
            time.sleep(2)
            continue

        url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{fname}?{token}"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    with open(temp_path, "wb") as out_f:
                        while True:
                            chunk = resp.read(65536)
                            if not chunk:
                                break
                            out_f.write(chunk)
                    
                    # Atomic rename
                    if os.path.exists(target_path):
                        try: os.remove(target_path)
                        except Exception: pass
                    os.rename(temp_path, target_path)

                    file_size = os.path.getsize(target_path)
                    with stats['lock']:
                        stats['done'] += 1
                        stats['bytes'] += file_size
                        stats['downloaded'] += 1
                        perc = (stats['done'] / total_items) * 100
                        total_mb = stats['bytes'] / (1024 * 1024)
                        print(f"[{stats['done']:4d}/{total_items}] ({perc:5.1f}%) [DOWNLOADED] {fname:11s} ({file_size/(1024*1024):.2f} MB) | Total: {total_mb:.1f} MB")
                    return True
        except urllib.error.HTTPError as he:
            if he.code == 403:
                print(f"[HTTP 403 on {fname}] Token expired, refreshing...")
                get_valid_token(force_refresh=True)
                time.sleep(1)
            else:
                print(f"[HTTP {he.code} on {fname}] Attempt {attempt}/3")
                time.sleep(2)
        except Exception as e:
            print(f"[Error on {fname}] {e}, Attempt {attempt}/3")
            time.sleep(2)

    if os.path.exists(temp_path):
        try: os.remove(temp_path)
        except Exception: pass

    with stats['lock']:
        stats['failed'] += 1
        print(f"[FAILED] Could not download {fname} after 3 attempts")
    return False

def build_queue(scope, book_filter=None):
    queue = []
    for slug, usfm, chapters, testament in CANONICAL_BOOKS:
        if book_filter and slug != book_filter.lower() and usfm.lower() != book_filter.lower():
            continue
        if scope == 'nt' and testament != 'nt':
            continue
        if scope == 'ot' and testament != 'ot':
            continue
        if scope == 'test':
            if (usfm, 1) in [('GEN', 1), ('PSA', 23), ('MAT', 1), ('JHN', 1)]:
                queue.append((slug, usfm, 1 if usfm != 'PSA' else 23, testament))
            continue

        for ch in range(1, chapters + 1):
            queue.append((slug, usfm, ch, testament))
    return queue

def main():
    parser = argparse.ArgumentParser(description="Download Marathi BSI Holy Bible Audio (MARVBSI) locally")
    parser.add_argument("--scope", choices=['all', 'nt', 'ot', 'test'], default='all', help="Scope of chapters to download (default: all)")
    parser.add_argument("--book", type=str, default=None, help="Download a specific book only (e.g. matthew, genesis)")
    parser.add_argument("--workers", type=int, default=5, help="Number of concurrent download threads (default: 5)")
    args = parser.parse_args()

    os.makedirs(TARGET_DIR, exist_ok=True)

    print("=====================================================================")
    print("  RIVER OF LIFE - BSI MARATHI AUDIO LOCAL DOWNLOADER (MARVBSI)      ")
    print("=====================================================================")
    print(f"Target Directory : {TARGET_DIR}")
    print(f"Selected Scope   : {args.scope.upper()}" + (f" (Book: {args.book})" if args.book else ""))
    print(f"Worker Threads   : {args.workers}")
    print("=====================================================================")

    # Ensure token is active
    tok = get_valid_token()
    if not tok:
        print("[FATAL] Could not initialize a valid BSI CloudFront token.")
        sys.exit(1)

    items = build_queue(args.scope, args.book)
    total_items = len(items)
    print(f"Total chapters queued for download: {total_items}")
    if total_items == 0:
        print("No items to download.")
        return

    stats = {
        'done': 0,
        'downloaded': 0,
        'skipped': 0,
        'failed': 0,
        'bytes': 0,
        'lock': threading.Lock()
    }

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(download_chapter, item, stats, total_items) for item in items]
        for f in as_completed(futures):
            f.result()

    total_time = time.time() - t0
    total_mb = stats['bytes'] / (1024 * 1024)
    speed = (total_mb / total_time) if total_time > 0 else 0

    print("\n=====================================================================")
    print("  DOWNLOAD SUMMARY                                                  ")
    print("=====================================================================")
    print(f"Chapters Processed : {stats['done']} / {total_items}")
    print(f"Newly Downloaded   : {stats['downloaded']}")
    print(f"Already Existed    : {stats['skipped']}")
    print(f"Failed             : {stats['failed']}")
    print(f"Total Disk Space   : {total_mb:.2f} MB ({total_mb/1024:.2f} GB)")
    print(f"Elapsed Time       : {total_time:.1f} seconds ({total_time/60:.2f} min)")
    print(f"Average Speed      : {speed:.2f} MB/s")
    print("=====================================================================\n")

    # Generate audio manifest
    manifest_path = os.path.join(TARGET_DIR, "audio_manifest.json")
    saved_files = []
    for f in sorted(os.listdir(TARGET_DIR)):
        if f.endswith(".mp3"):
            saved_files.append({
                "file": f,
                "sizeBytes": os.path.getsize(os.path.join(TARGET_DIR, f))
            })
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump({
            "totalChapters": len(saved_files),
            "generatedAt": int(time.time()),
            "files": saved_files
        }, mf, indent=2)
    print(f"[Manifest] Updated {manifest_path} with {len(saved_files)} audio chapters.")

if __name__ == "__main__":
    main()
