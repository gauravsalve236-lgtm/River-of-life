import http.server
import socketserver
import webbrowser
import os
import sys
import json
import time
import re
import urllib.parse
import urllib.request
import threading

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(DIRECTORY, '.bsi_token.json')
REFRESH_LOCK = threading.Lock()

USFM_MAP = {
    "genesis": "GEN", "exodus": "EXO", "leviticus": "LEV", "numbers": "NUM",
    "deuteronomy": "DEU", "joshua": "JOS", "judges": "JDG", "ruth": "RUT",
    "1samuel": "1SA", "2samuel": "2SA", "1kings": "1KI", "2kings": "2KI",
    "1chronicles": "1CH", "2chronicles": "2CH", "ezra": "EZR", "nehemiah": "NEH",
    "esther": "EST", "job": "JOB", "psalms": "PSA", "proverbs": "PRO",
    "ecclesiastes": "ECC", "songofsolomon": "SNG", "isaiah": "ISA", "jeremiah": "JER",
    "lamentations": "LAM", "ezekiel": "EZK", "daniel": "DAN", "hosea": "HOS",
    "joel": "JOL", "amos": "AMO", "obadiah": "OBA", "jonah": "JON",
    "micah": "MIC", "nahum": "NAM", "habakkuk": "HAB", "zephaniah": "ZEP",
    "haggai": "HAG", "zechariah": "ZEC", "malachi": "MAL", "matthew": "MAT",
    "mark": "MRK", "luke": "LUK", "john": "JHN", "acts": "ACT",
    "romans": "ROM", "1corinthians": "1CO", "2corinthians": "2CO", "galatians": "GAL",
    "ephesians": "EPH", "philippians": "PHP", "colossians": "COL", "1thessalonians": "1TH",
    "2thessalonians": "2TH", "1timothy": "1TI", "2timothy": "2TI", "titus": "TIT",
    "philemon": "PHM", "hebrews": "HEB", "james": "JAS", "1peter": "1PE",
    "2peter": "2PE", "1john": "1JN", "2john": "2JN", "3john": "3JN",
    "jude": "JUD", "revelation": "REV"
}

# Current live wildcard CloudFront token (valid for 555476c2390c102d-04/*)
CURRENT_TOKEN = 'Key-Pair-Id=KCC7HS8KPVISV&Signature=HsevzkG62MRVWgMjPtjmLvmx2Qzq6moXVwo7RE3M250qkTjDq6rAZAEB1obYccUuU9jGfmYzl0oZaLG08XIhVOnQePe9ck0eg0aT8Ih8jKL0C34ClnM03~bm4XCqK6uaw-QpmldRRV3DGgQ8wFcCSAWCUEZTBXa32xUondcI-h4yuIz53GOZgv-yRqZ88gyuUpWMw80KcMMN2D7iPNEIWvLOHtLv8p6fCxfhOnTg0XNx-8UnoVTrmygwrj58D7vEpMldYqd~4oEn43o7pp1hMqYwfdY3Qx9I2OMpI3VqLSQhDOJMiwdWPZpS4Mg7OAj2dRaWxqgllRu4ZsEfGyJl2Q__&Expires=1789032121&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9kMWhrcHV6Mm81YTJ4dy5jbG91ZGZyb250Lm5ldC9zb3VyY2UvNTU1NDc2YzIzOTBjMTAyZC0wNC8qIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzg5MDMyMTIxfX19XX0_'

# Load persisted token if present
if os.path.exists(TOKEN_FILE):
    try:
        with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if data.get('token'):
                CURRENT_TOKEN = data['token']
    except Exception:
        pass

def is_token_expired(token):
    if not token:
        return True
    m = re.search(r'Expires=(\d+)', token)
    if m:
        exp = int(m.group(1))
        # Consider expired 5 minutes before official cutoff
        return time.time() >= (exp - 300)
    return False

def refresh_token():
    global CURRENT_TOKEN
    with REFRESH_LOCK:
        if not is_token_expired(CURRENT_TOKEN):
            return True
        try:
            print("[BSI Audio] Refreshing live CloudFront token from indian.bible...")
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto("https://www.indian.bible/bible/MARVBSI/GEN.1", wait_until="networkidle", timeout=30000)
                audio_src = page.evaluate("() => document.querySelector('audio')?.src || ''")
                browser.close()
                if "?" in audio_src:
                    CURRENT_TOKEN = audio_src.split("?", 1)[1]
                    try:
                        with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
                            json.dump({"token": CURRENT_TOKEN, "savedAt": time.time()}, f)
                    except Exception:
                        pass
                    print("[BSI Audio] Successfully refreshed live CloudFront token!")
                    return True
        except Exception as e:
            print("[BSI Audio] Token refresh failed:", e)
        return False

def get_valid_token():
    if is_token_expired(CURRENT_TOKEN):
        refresh_token()
    return CURRENT_TOKEN

class LocalAppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError, ConnectionError):
            pass

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/bsi-audio-stream':
            qs = urllib.parse.parse_qs(parsed.query)
            book_key = qs.get('book', ['genesis'])[0].lower().replace('.json', '')
            try:
                chapter = int(qs.get('chapter', ['1'])[0])
            except ValueError:
                chapter = 1

            usfm = USFM_MAP.get(book_key, "GEN")
            fname = f"{usfm}_{chapter:03d}.mp3"
            token = get_valid_token()
            audio_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{fname}?{token}"

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://www.indian.bible/',
                'Origin': 'https://www.indian.bible'
            }
            if 'Range' in self.headers:
                headers['Range'] = self.headers['Range']

            req = urllib.request.Request(audio_url, headers=headers)
            try:
                resp = urllib.request.urlopen(req)
            except Exception as e:
                self.send_error(500, f"Error: {e}")
                return

            self.send_response(resp.status)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            for h in ['Content-Range', 'Content-Length']:
                val = resp.headers.get(h)
                if val:
                    self.send_header(h, val)
            self.end_headers()
            resp.close()
            return
        return super().do_HEAD()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. API endpoint to return dynamic BSI audio URL
        if parsed.path == '/api/bsi-audio-url':
            qs = urllib.parse.parse_qs(parsed.query)
            book_key = qs.get('book', ['genesis'])[0].lower().replace('.json', '')
            chapter = int(qs.get('chapter', ['1'])[0])
            
            usfm = USFM_MAP.get(book_key, "GEN")
            fname = f"{usfm}_{chapter:03d}.mp3"
            token = get_valid_token()
            audio_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{fname}?{token}"
            proxy_url = f"/api/bsi-audio-stream?book={book_key}&chapter={chapter}"
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "book": book_key,
                "chapter": chapter,
                "usfm": usfm,
                "audioUrl": audio_url,
                "proxyUrl": proxy_url
            }).encode('utf-8'))
            return

        # 2. Resilient Audio Streaming Proxy with HTTP Range (seeking) support
        elif parsed.path == '/api/bsi-audio-stream':
            qs = urllib.parse.parse_qs(parsed.query)
            book_key = qs.get('book', ['genesis'])[0].lower().replace('.json', '')
            try:
                chapter = int(qs.get('chapter', ['1'])[0])
            except ValueError:
                chapter = 1

            usfm = USFM_MAP.get(book_key, "GEN")
            fname = f"{usfm}_{chapter:03d}.mp3"
            token = get_valid_token()
            audio_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{fname}?{token}"

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://www.indian.bible/',
                'Origin': 'https://www.indian.bible'
            }
            if 'Range' in self.headers:
                headers['Range'] = self.headers['Range']

            req = urllib.request.Request(audio_url, headers=headers)
            try:
                resp = urllib.request.urlopen(req)
            except urllib.error.HTTPError as e:
                if e.code == 403:
                    print("[BSI Audio Stream] CloudFront 403 Forbidden - renewing token...")
                    refresh_token()
                    token = CURRENT_TOKEN
                    audio_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{fname}?{token}"
                    req = urllib.request.Request(audio_url, headers=headers)
                    try:
                        resp = urllib.request.urlopen(req)
                    except Exception as e2:
                        self.send_error(500, f"Upstream error: {e2}")
                        return
                else:
                    self.send_error(e.code, f"Upstream error: {e}")
                    return
            except Exception as e:
                self.send_error(500, f"Error: {e}")
                return

            self.send_response(resp.status)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            for h in ['Content-Range', 'Content-Length']:
                val = resp.headers.get(h)
                if val:
                    self.send_header(h, val)
            self.end_headers()

            try:
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass
            finally:
                resp.close()
            return

        # 3. Manual Token Refresh Endpoint
        elif parsed.path == '/api/refresh-bsi-token':
            success = refresh_token()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": success, "token": CURRENT_TOKEN}).encode('utf-8'))
            return

        return super().do_GET()

def start_app():
    print('==================================================')
    print('  River of Life Bible App - Local Server (V25.9)')
    print('  URL: http://localhost:' + str(PORT))
    print('  Directory: ' + DIRECTORY)
    print('  Server: Concurrent Multi-Threaded HTTP Engine')
    print('  BSI Dramatized Audio: Auto-Refreshing Proxy Enabled')
    print('==================================================')

    # Background check token expiration on boot
    def bg_check():
        if is_token_expired(CURRENT_TOKEN):
            refresh_token()
    threading.Thread(target=bg_check, daemon=True).start()

    try:
        webbrowser.open('http://localhost:' + str(PORT) + '/index.html')
    except Exception as e:
        print('Could not automatically open browser:', e)

    try:
        http.server.ThreadingHTTPServer.allow_reuse_address = True
        with http.server.ThreadingHTTPServer(('', PORT), LocalAppHandler) as httpd:
            print('Server is running concurrently on http://localhost:' + str(PORT) + ' (Press Ctrl+C to stop)...')
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping River of Life Bible App server. Goodbye!')
        sys.exit(0)

if __name__ == '__main__':
    start_app()
