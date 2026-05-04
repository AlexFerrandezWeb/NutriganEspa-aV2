import pathlib

svg_preload = '<link rel="preload" href="assets/icons.svg" as="image">'
insert_after = '<link rel="stylesheet" href="reset.css">'

for path in pathlib.Path('..').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    if svg_preload not in text and insert_after in text:
        text = text.replace(insert_after, insert_after + '\n    ' + svg_preload)
        path.write_text(text, encoding='utf-8')
print('Added SVG preload')
