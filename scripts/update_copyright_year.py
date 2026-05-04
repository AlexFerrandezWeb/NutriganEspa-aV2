import glob

for path in glob.glob('*.html'):
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    if '2025 Nutrigan España' in content:
        content = content.replace('2025 Nutrigan España', '2026 Nutrigan España')
        with open(path, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Updated: {path}')
