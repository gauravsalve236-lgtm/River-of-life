import http.server
import socketserver
import urllib.parse
import urllib.request
import json
import asyncio
import io
import os
import sys
import re
import time
import edge_tts

PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

BSI_USFM_MAP = {
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

_CACHED_BSI_TOKEN = None
_CACHED_BSI_EXPIRY = 0

def get_live_bsi_token(force_refresh=False):
    global _CACHED_BSI_TOKEN, _CACHED_BSI_EXPIRY
    now = int(time.time())
    if not force_refresh and _CACHED_BSI_TOKEN and now < (_CACHED_BSI_EXPIRY - 120):
        return _CACHED_BSI_TOKEN

    token_file = os.path.join(DIRECTORY, "assets", "bsi_token.json")
    if not force_refresh and os.path.exists(token_file):
        try:
            with open(token_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                tok = data.get("token")
                m = re.search(r'Expires=(\d+)', tok or '')
                if m and int(m.group(1)) > (now + 120):
                    _CACHED_BSI_TOKEN = tok
                    _CACHED_BSI_EXPIRY = int(m.group(1))
                    return tok
        except Exception:
            pass

    # Scrape fresh token from indian.bible
    urls = [
        "https://www.indian.bible/bible/MARVBSI/GEN.1",
        "https://www.indian.bible/bible/MARVBSI/MAT.1",
        "https://www.indian.bible/bible/MARVBSI/PSA.23"
    ]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    pattern = r'https://d1hkpuz2o5a2xw\.cloudfront\.net/source/555476c2390c102d-04/[^\s"\'<>]+\?([^\s"\'<>]+)'

    for u in urls:
        try:
            req = urllib.request.Request(u, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                matches = re.findall(pattern, html)
                for raw in matches:
                    tok = raw.lstrip('?').replace('&amp;', '&').rstrip('"\'')
                    if "Key-Pair-Id=" in tok and "Signature=" in tok and "Expires=" in tok:
                        # Verify against CloudFront HEAD
                        test_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/GEN_001.mp3?{tok}"
                        head_req = urllib.request.Request(test_url, headers=headers, method="HEAD")
                        try:
                            with urllib.request.urlopen(head_req, timeout=10) as head_resp:
                                if head_resp.status == 200:
                                    m = re.search(r'Expires=(\d+)', tok)
                                    exp = int(m.group(1)) if m else (now + 7200)
                                    _CACHED_BSI_TOKEN = tok
                                    _CACHED_BSI_EXPIRY = exp
                                    # Save to assets/bsi_token.json
                                    payload = {"token": tok, "updatedAt": now}
                                    for p in [token_file, os.path.join(DIRECTORY, ".bsi_token.json")]:
                                        try:
                                            os.makedirs(os.path.dirname(p), exist_ok=True)
                                            with open(p, "w", encoding="utf-8") as f:
                                                json.dump(payload, f, indent=2)
                                        except Exception:
                                            pass
                                    return tok
                        except Exception as e:
                            print(f"[BSI Scraper] Verify failed: {e}")
        except Exception as e:
            print(f"[BSI Scraper] Fetch {u} error: {e}")

    return _CACHED_BSI_TOKEN

class DevotionalTTSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/tts/edge':
            self.handle_edge_tts(parsed.query)
        elif parsed.path == '/api/tts/voices':
            self.handle_list_voices()
        elif parsed.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"ok","neural_voice":"mr-IN-ManoharNeural"}')
        elif parsed.path == '/api/refresh-bsi-token':
            self.handle_refresh_bsi_token()
        elif parsed.path == '/api/bsi-audio-stream':
            self.handle_bsi_audio_stream(parsed.query)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ['/api/tts/edge', '/api/tts/convert', '/api/tts/stream']:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body) if body else {}
            except Exception:
                data = {}
            self.handle_edge_tts_post(data)
        else:
            self.send_error(404, 'Endpoint not found')

    def handle_edge_tts(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        text = params.get('text', [''])[0]
        voice = params.get('voice', ['mr-IN-ManoharNeural'])[0]
        rate = params.get('rate', ['-6%'])[0]
        pitch = params.get('pitch', ['-2Hz'])[0]

        if not text.strip():
            self.send_error(400, 'Parameter text is required.')
            return

        try:
            audio_data = self._synthesize_sync(text, voice, rate, pitch)
            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(len(audio_data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.end_headers()
            self.wfile.write(audio_data)
        except Exception as e:
            print(f'[Edge TTS Error] {e}', file=sys.stderr)
            self.send_error(500, f'TTS Error: {str(e)}')

    def handle_edge_tts_post(self, data):
        text = data.get('text', '')
        voice = data.get('voice', 'mr-IN-ManoharNeural')
        rate = data.get('rate', '-6%')
        pitch = data.get('pitch', '-2Hz')

        if not text.strip():
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"error":"Field text is required."}')
            return

        try:
            audio_data = self._synthesize_sync(text, voice, rate, pitch)
            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(len(audio_data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(audio_data)
        except Exception as e:
            print(f'[Edge TTS Error] {e}', file=sys.stderr)
            self.send_error(500, f'TTS Error: {str(e)}')

    def _synthesize_sync(self, text, voice, rate, pitch):
        async def _async_gen():
            cleaned = text.replace('[', '').replace(']', '').replace('*', '').strip()
            comm = edge_tts.Communicate(cleaned, voice, rate=rate, pitch=pitch)
            buf = io.BytesIO()
            async for chunk in comm.stream():
                if chunk['type'] == 'audio':
                    buf.write(chunk['data'])
            return buf.getvalue()
        
        return asyncio.run(_async_gen())

    def handle_refresh_bsi_token(self):
        token = get_live_bsi_token(force_refresh=True)
        self.send_response(200 if token else 500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        if token:
            payload = {'success': True, 'token': token, 'updatedAt': int(time.time())}
        else:
            payload = {'success': False, 'error': 'Failed to scrape BSI token'}
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def handle_bsi_audio_stream(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        book = params.get('book', ['genesis'])[0].lower().replace('.json', '').replace('-', '').replace('_', '')
        chapter = params.get('chapter', ['1'])[0]
        try:
            ch_num = int(chapter)
        except ValueError:
            ch_num = 1
        ch_str = f"{ch_num:03d}"
        usfm = BSI_USFM_MAP.get(book, 'GEN')

        # 1. First priority: Check local offline storage (instant playback, 0 network, no token)
        local_path = os.path.join(DIRECTORY, "assets", "audio", "bsi", f"{usfm}_{ch_str}.mp3")
        if os.path.exists(local_path) and os.path.getsize(local_path) > 50000:
            file_size = os.path.getsize(local_path)
            range_header = self.headers.get('Range')
            if range_header:
                m = re.match(r'bytes=(\d+)-(\d*)', range_header)
                if m:
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else file_size - 1
                    end = min(end, file_size - 1)
                    length = end - start + 1
                    self.send_response(206)
                    self.send_header('Content-Type', 'audio/mpeg')
                    self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                    self.send_header('Content-Length', str(length))
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('X-Audio-Source', 'local-offline-storage')
                    self.end_headers()
                    with open(local_path, 'rb') as f:
                        f.seek(start)
                        self.wfile.write(f.read(length))
                    return
            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('X-Audio-Source', 'local-offline-storage')
            self.end_headers()
            with open(local_path, 'rb') as f:
                self.wfile.write(f.read())
            return

        token = get_live_bsi_token(force_refresh=False)
        if not token:
            token = get_live_bsi_token(force_refresh=True)

        if not token:
            self.send_error(502, 'BSI audio token could not be obtained')
            return

        cf_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{usfm}_{ch_str}.mp3?{token}"
        req_headers = {'User-Agent': 'Mozilla/5.0'}
        # Forward Range header if present
        range_header = self.headers.get('Range')
        if range_header:
            req_headers['Range'] = range_header

        try:
            req = urllib.request.Request(cf_url, headers=req_headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                self.send_response(resp.status)
                for h in ['Content-Type', 'Content-Length', 'Accept-Ranges', 'Content-Range']:
                    val = resp.headers.get(h)
                    if val:
                        self.send_header(h, val)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 403:
                # Token expired, try one force refresh
                token = get_live_bsi_token(force_refresh=True)
                if token:
                    cf_url = f"https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/{usfm}_{ch_str}.mp3?{token}"
                    try:
                        req = urllib.request.Request(cf_url, headers=req_headers)
                        with urllib.request.urlopen(req, timeout=20) as resp:
                            self.send_response(resp.status)
                            for h in ['Content-Type', 'Content-Length', 'Accept-Ranges', 'Content-Range']:
                                val = resp.headers.get(h)
                                if val:
                                    self.send_header(h, val)
                            self.send_header('Access-Control-Allow-Origin', '*')
                            self.end_headers()
                            self.wfile.write(resp.read())
                            return
                    except Exception:
                        pass
            self.send_error(e.code, f"BSI Stream Error: {e.reason}")
        except Exception as e:
            self.send_error(500, f"BSI Stream Error: {str(e)}")

    def handle_list_voices(self):
        voices = [
            {
                'id': 'manohar_natural',
                'name': 'Manohar - Natural Marathi Devotional',
                'voice_name': 'mr-IN-ManoharNeural',
                'gender': 'Male',
                'recommended': True
            }
        ]
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': True, 'voices': voices}).encode('utf-8'))

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    with ThreadedHTTPServer(('127.0.0.1', port), DevotionalTTSHandler) as httpd:
        print(f"Serving on http://127.0.0.1:{port}", flush=True)
        httpd.serve_forever()
