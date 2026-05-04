import pathlib

for path in pathlib.Path('..').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    if '<noscript><link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">' in text:
        text = text.replace('<noscript><link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">', '<noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">')
    text = text.replace('</noscript></noscript>', '</noscript>')
    if text != path.read_text(encoding='utf-8'):
        path.write_text(text, encoding='utf-8')
print('fixed')
