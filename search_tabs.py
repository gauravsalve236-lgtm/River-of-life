with open("index.css", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split('\n')
print("--- Matches in index.css ---")
for i, line in enumerate(lines):
    if "split-screen" in line or "view-reader" in line:
        print(f"L{i+1}: {line.strip()}")
