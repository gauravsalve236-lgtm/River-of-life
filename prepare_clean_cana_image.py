from PIL import Image
import os

src_path = r"C:\Users\Gaurav.Salve\.gemini\antigravity\brain\e007d14a-a9c4-4426-9252-fe55c0f21273\.user_uploaded\media_1787757652080.jpg"
dst_path1 = r"C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr\assets\images\wedding_cana_v425.png"
dst_path2 = r"C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr\docs\assets\images\wedding_cana_v425.png"

img = Image.open(src_path)
img.save(dst_path1, "PNG")
img.save(dst_path2, "PNG")
print(f"Clean high-res artwork saved successfully to {dst_path1}! Dimensions: {img.size}")
