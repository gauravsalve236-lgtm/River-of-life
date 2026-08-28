import os
from PIL import Image, ImageOps

SRC_IMAGE = r"C:\Users\Gaurav.Salve\.gemini\antigravity\brain\e007d14a-a9c4-4426-9252-fe55c0f21273\.user_uploaded\media_1787722449216.png"
BASE_DIR = r"C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr"

def process_fullsize_transparent_logo():
    print("Loading source logo:", SRC_IMAGE)
    img = Image.open(SRC_IMAGE).convert("RGBA")
    
    # 1. Bounding box crop around the Holy Bible graphic (remove all surrounding whitespace/margins)
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    diff = ImageOps.invert(Image.alpha_composite(bg, img).convert("RGB"))
    bbox = diff.getbbox()
    
    if bbox:
        cropped = img.crop(bbox)
    else:
        cropped = img
        
    print(f"Original size: {img.size}, Cropped bounding box: {bbox}")

    def create_transparent_icon(target_size, padding_ratio=0.01):
        # Create a 100% ALPHA TRANSPARENT icon (NO white corners, NO background box)
        w, h = target_size
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0)) # 100% Transparent
        
        avail_w = int(w * (1 - 2 * padding_ratio))
        avail_h = int(h * (1 - 2 * padding_ratio))
        
        aspect = cropped.width / cropped.height
        if avail_w / avail_h > aspect:
            new_h = avail_h
            new_w = int(new_h * aspect)
        else:
            new_w = avail_w
            new_h = int(new_w / aspect)
            
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (w - new_w) // 2
        offset_y = (h - new_h) // 2
        
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    # Targets to save
    targets = [
        (os.path.join(BASE_DIR, "assets", "icons", "icon-512.png"), (512, 512)),
        (os.path.join(BASE_DIR, "assets", "icons", "icon-192.png"), (192, 192)),
        (os.path.join(BASE_DIR, "assets", "icons", "logo-transparent.png"), (512, 512)),
        (os.path.join(BASE_DIR, "assets", "icons", "app-logo.png"), (512, 512)),
        (os.path.join(BASE_DIR, "assets", "icons", "River_of_life_logo.png"), (512, 512)),
        (os.path.join(BASE_DIR, "favicon.png"), (192, 192)),
        (os.path.join(BASE_DIR, "docs", "assets", "icons", "icon-512.png"), (512, 512)),
        (os.path.join(BASE_DIR, "docs", "assets", "icons", "icon-192.png"), (192, 192)),
        (os.path.join(BASE_DIR, "docs", "assets", "icons", "logo-transparent.png"), (512, 512)),
        (os.path.join(BASE_DIR, "docs", "favicon.png"), (192, 192)),
    ]

    # Android mipmap targets
    android_res = os.path.join(BASE_DIR, "android", "app", "src", "main", "res")
    if os.path.exists(android_res):
        density_map = {
            "mipmap-mdpi": 48,
            "mipmap-hdpi": 72,
            "mipmap-xhdpi": 96,
            "mipmap-xxhdpi": 144,
            "mipmap-xxxhdpi": 192
        }
        for density, px in density_map.items():
            folder = os.path.join(android_res, density)
            if os.path.exists(folder):
                targets.append((os.path.join(folder, "ic_launcher.png"), (px, px)))
                targets.append((os.path.join(folder, "ic_launcher_round.png"), (px, px)))
                targets.append((os.path.join(folder, "ic_launcher_foreground.png"), (px, px)))

        drawable_folders = ["drawable", "drawable-port-hdpi", "drawable-port-mdpi", "drawable-port-xhdpi", "drawable-port-xxhdpi", "drawable-port-xxxhdpi", "drawable-land-hdpi", "drawable-land-mdpi", "drawable-land-xhdpi", "drawable-land-xxhdpi", "drawable-land-xxxhdpi"]
        for df in drawable_folders:
            df_path = os.path.join(android_res, df)
            if os.path.exists(df_path):
                targets.append((os.path.join(df_path, "splash.png"), (512, 512)))

    for path, sz in targets:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # 100% Alpha Transparent canvas with no background color and 1% padding so only the Holy Bible graphic shows
        icon_img = create_transparent_icon(sz, padding_ratio=0.01)
        icon_img.save(path)

    print("All 100% transparent full-size app icons generated successfully!")

if __name__ == "__main__":
    process_fullsize_transparent_logo()
