import os
import re
import glob

# List of all HTML files
html_files = glob.glob('c:/Proyectos/NutriganV2/*.html')

for file_path in html_files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace <img tags without loading="lazy" with loading="lazy" added
        # Pattern: <img without loading attribute
        pattern = r'<img\s+([^>]*?)(?<!loading="lazy")(\s*>)'
        replacement = r'<img \1 loading="lazy"\2'
        
        # More robust: find img tags and add loading="lazy" if not present
        modified = False
        lines = content.split('\n')
        new_lines = []
        
        for line in lines:
            if '<img' in line and 'loading="lazy"' not in line:
                # Add loading="lazy" before the closing >
                line = line.replace('>', ' loading="lazy">', 1)
                line = line.replace('  loading="lazy"', ' loading="lazy"')  # Clean up double spaces
                modified = True
            new_lines.append(line)
        
        if modified:
            new_content = '\n'.join(new_lines)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Updated {os.path.basename(file_path)}")
        else:
            print(f"- No changes needed in {os.path.basename(file_path)}")
    
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")

print("\nLazy loading update complete!")
