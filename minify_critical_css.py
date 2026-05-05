import re

def minify_css(css):
    """Minify CSS by removing comments, unnecessary whitespace, etc."""
    # Remove comments
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    # Remove whitespace around delimiters
    css = re.sub(r'\s*([{}:;,>+~])\s*', r'\1', css)
    # Remove leading/trailing whitespace
    css = css.strip()
    return css

# Read and minify critical CSS
with open('c:/Proyectos/NutriganV2/critical.css', 'r', encoding='utf-8') as f:
    critical = f.read()

minified = minify_css(critical)

# Save minified version
with open('c:/Proyectos/NutriganV2/critical.min.css', 'w', encoding='utf-8') as f:
    f.write(minified)

print(f"Original: {len(critical)} bytes")
print(f"Minified: {len(minified)} bytes")
print(f"Saved: {len(critical) - len(minified)} bytes ({((len(critical) - len(minified)) / len(critical) * 100):.1f}%)")
