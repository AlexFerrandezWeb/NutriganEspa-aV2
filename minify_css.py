import re

def minify_css(css_content):
    # Remove comments
    css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    # Remove whitespace
    css_content = re.sub(r'\s+', ' ', css_content)
    # Remove spaces around selectors, properties, etc.
    css_content = re.sub(r'\s*([{}:;,])\s*', r'\1', css_content)
    # Remove trailing semicolons before closing braces
    css_content = re.sub(r';}', '}', css_content)
    return css_content.strip()

# Read the CSS file
with open('c:/Proyectos/NutriganV2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Minify
minified = minify_css(css)

# Write to new file
with open('c:/Proyectos/NutriganV2/style.min.css', 'w', encoding='utf-8') as f:
    f.write(minified)

print(f"Original size: {len(css)} bytes")
print(f"Minified size: {len(minified)} bytes")
print(f"Saved: {len(css) - len(minified)} bytes ({((len(css) - len(minified)) / len(css) * 100):.1f}%)")