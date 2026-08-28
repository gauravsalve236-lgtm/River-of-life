from PIL import Image
import os

src_path = r"C:\Users\Gaurav.Salve\.gemini\antigravity\brain\e007d14a-a9c4-4426-9252-fe55c0f21273\.user_uploaded\media_1787759195575.png"
dst_path1 = r"C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr\assets\images\wedding_cana.png"
dst_path2 = r"C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr\docs\assets\images\wedding_cana.png"

img = Image.open(src_path)
w, h = img.size

# Modal image bounds in 1024x761 coordinate space
left = int(w * 0.147)
top = int(h * 0.158)
right = int(w * 0.853)
bottom = int(h * 0.565)

cropped = img.crop((left, top, right, bottom))
cropped.save(dst_path1, "PNG")
cropped.save(dst_path2, "PNG")
print(f"Cropped image saved successfully to {dst_path1}! Dimensions: {cropped.size}")
