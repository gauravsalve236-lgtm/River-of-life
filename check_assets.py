import urllib.request
import re

with open(r'C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr\index.html', encoding='utf-8') as f:
    content = f.read()

sources = re.findall(r'src=["\']([^"\']+)["\']', content) + re.findall(r'href=["\']([^"\']+)["\']', content)

for src in set(sources):
    if not src.startswith('http') and not src.startswith('#') and not src.startswith('data:'):
        url = f'http://127.0.0.1:7880/{src.lstrip("/")}'
        try:
            with urllib.request.urlopen(url) as res:
                if res.status != 200:
                    print(f'Asset {src} returned HTTP {res.status}')
        except Exception as e:
            print(f'Asset {src} failed: {e}')
