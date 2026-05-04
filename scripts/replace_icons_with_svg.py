import pathlib
import re

replacements = {
    '<i class="fas fa-shopping-cart"></i>': '<svg class="icon icon-shopping-cart"><use xlink:href="assets/icons.svg#icon-shopping-cart"></use></svg>',
    '<i class="fas fa-search"></i>': '<svg class="icon icon-search"><use xlink:href="assets/icons.svg#icon-search"></use></svg>',
    '<i class="fas fa-chevron-left"></i>': '<svg class="icon icon-chevron-left"><use xlink:href="assets/icons.svg#icon-chevron-left"></use></svg>',
    '<i class="fas fa-chevron-right"></i>': '<svg class="icon icon-chevron-right"><use xlink:href="assets/icons.svg#icon-chevron-right"></use></svg>',
    '<i class="fas fa-times"></i>': '<svg class="icon icon-times"><use xlink:href="assets/icons.svg#icon-times"></use></svg>',
    '<i class="fas fa-phone"></i>': '<svg class="icon icon-phone"><use xlink:href="assets/icons.svg#icon-phone"></use></svg>',
    '<i class="fas fa-envelope"></i>': '<svg class="icon icon-envelope"><use xlink:href="assets/icons.svg#icon-envelope"></use></svg>',
    '<i class="fas fa-map-marker-alt"></i>': '<svg class="icon icon-map-marker"><use xlink:href="assets/icons.svg#icon-map-marker"></use></svg>',
    '<i class="fab fa-whatsapp"></i>': '<svg class="icon icon-whatsapp"><use xlink:href="assets/icons.svg#icon-whatsapp"></use></svg>',
}

for path in pathlib.Path('..').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    new_text = text
    for old, new in replacements.items():
        new_text = new_text.replace(old, new)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
print('Replaced critical icons with SVG')
