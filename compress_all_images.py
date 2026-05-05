from PIL import Image
import os
import glob

def compress_webp(input_path, output_path, quality=70, max_width=1920):
    try:
        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Resize if too large
            if img.width > max_width:
                aspect_ratio = img.height / img.width
                new_height = int(max_width * aspect_ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save with WebP compression
            img.save(output_path, 'WEBP', quality=quality, method=6)
            original_size = os.path.getsize(input_path)
            new_size = os.path.getsize(output_path)
            percent = (new_size/original_size*100) if original_size > 0 else 0
            print(f"{os.path.basename(input_path)}: {original_size} → {new_size} bytes ({percent:.1f}%)")
    except Exception as e:
        print(f"Error: {os.path.basename(input_path)}: {e}")

# Compress ALL WebP images in assets folder
print("Compressing all WebP images in assets/...\n")
assets_path = 'c:/Proyectos/NutriganV2/assets/*.webp'
count = 0
for img_path in glob.glob(assets_path):
    compress_webp(img_path, img_path, quality=70, max_width=1920)
    count += 1

print(f"\nTotal images processed: {count}")
