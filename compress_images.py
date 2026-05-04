from PIL import Image
import os

def compress_webp(input_path, output_path, quality=80, max_width=1920):
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
            print(f"Compressed {input_path}: {original_size} -> {new_size} bytes ({(new_size/original_size*100):.1f}%), Size: {img.size}")
    except Exception as e:
        print(f"Error compressing {input_path}: {e}")

# Compress the large carousel images
images_to_compress = [
    'assets/img-carrusel.webp',
    'assets/img-carrusel2.webp',
    'assets/img-carrusel3.webp',
    'assets/img-carrusel4.webp',
    'assets/img-carrusel5.webp'
]

for img in images_to_compress:
    input_path = f'c:/Proyectos/NutriganV2/{img}'
    output_path = input_path  # Overwrite
    if os.path.exists(input_path):
        compress_webp(input_path, output_path, quality=80)