import urllib.request
import re
import json
import time
import os
import sys

URLS_TO_TRY = [
    "https://www.indian.bible/bible/MARVBSI/GEN.1",
    "https://www.indian.bible/bible/MARVBSI/JHN.1",
    "https://www.indian.bible/bible/MARVBSI/MAT.1",
    "https://www.indian.bible/bible/MARVBSI/PSA.23"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,mr;q=0.8"
}

def verify_token(token):
    test_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/GEN_001.mp3?{token}"
    req = urllib.request.Request(test_url, headers={"User-Agent": HEADERS["User-Agent"]}, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[Verification Failed] {e}")
        return False

def extract_token(html):
    pattern = r'https://d1hkpuz2o5a2xw\.cloudfront\.net/source/555476c2390c102d-04/[^\s"\'<>]+\?([^\s"\'<>]+)'
    matches = re.findall(pattern, html)
    for raw in matches:
        token = raw.lstrip('?').replace('&amp;', '&').rstrip('"\'')
        if "Key-Pair-Id=" in token and "Signature=" in token and "Expires=" in token:
            return token
    return None

def fetch_live_token():
    for url in URLS_TO_TRY:
        try:
            print(f"[Fetch] Querying {url} ...")
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                token = extract_token(html)
                if token:
                    print(f"[Fetch] Found token signature: {token[:45]}...")
                    if verify_token(token):
                        print("[Fetch] Successfully verified token against CloudFront!")
                        return token
                    else:
                        print("[Fetch] Token verification failed, trying next URL...")
        except Exception as e:
            print(f"[Fetch Error] {url}: {e}")
            time.sleep(1)
    return None

def update_files(token):
    now = int(time.time())
    payload = {
        "token": token,
        "updatedAt": now
    }
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_json_files = [
        os.path.join(base_dir, "assets", "bsi_token.json"),
        os.path.join(base_dir, "docs", "assets", "bsi_token.json"),
        os.path.join(base_dir, ".bsi_token.json")
    ]
    
    for path in target_json_files:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"[Saved JSON] {path}")

    # Update hardcoded fallback in app.js and docs/app.js
    target_js_files = [
        os.path.join(base_dir, "app.js"),
        os.path.join(base_dir, "docs", "app.js")
    ]
    for js_path in target_js_files:
        if os.path.exists(js_path):
            with open(js_path, "r", encoding="utf-8") as f:
                content = f.read()
            new_content = re.sub(
                r"let bsiCloudFrontToken = '[^']+';",
                f"let bsiCloudFrontToken = '{token}';",
                content,
                count=1
            )
            if new_content != content:
                with open(js_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"[Updated JS fallback] {js_path}")

if __name__ == "__main__":
    print("=== River of Life BSI Audio Token Refresher ===")
    token = fetch_live_token()
    if not token:
        print("[ERROR] Failed to fetch or verify a valid BSI audio token.")
        sys.exit(1)
    
    update_files(token)
    print("=== Token refresh complete! ===")
