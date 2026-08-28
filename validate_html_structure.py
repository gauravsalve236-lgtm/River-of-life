from bs4 import BeautifulSoup

with open(r'C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr\index.html', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

body = soup.body
if body:
    print("--- Direct children of body ---")
    for elem in body.find_all(recursive=False):
        if elem.name:
            elem_id = elem.get('id', '')
            elem_cls = ' '.join(elem.get('class', []))
            print(f"<{elem.name} id='{elem_id}' class='{elem_cls}'>")
