import http.server
import socketserver
import urllib.parse
import json
import asyncio
import io
import os
import sys
import edge_tts

PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class DevotionalTTSHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
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

if __name__ == '__main__':
    http.server.test(HandlerClass=DevotionalTTSHandler, port=PORT, bind='127.0.0.1')
