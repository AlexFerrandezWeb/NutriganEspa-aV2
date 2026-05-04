import os
import glob

def replace_icons():
    # Lista de archivos HTML
    html_files = glob.glob('*.html')

    # Reemplazos a hacer
    replacements = {
        '<svg class="icon icon-phone"><use xlink:href="assets/icons.svg#icon-phone"></use></svg>': '<i class="fas fa-phone"></i>',
        '<svg class="icon icon-envelope"><use xlink:href="assets/icons.svg#icon-envelope"></use></svg>': '<i class="fas fa-envelope"></i>',
        '<svg class="icon icon-map-marker"><use xlink:href="assets/icons.svg#icon-map-marker"></use></svg>': '<i class="fas fa-map-marker-alt"></i>'
    }

    for file_path in html_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

            # Hacer todos los reemplazos
            for old, new in replacements.items():
                content = content.replace(old, new)

            # Escribir el archivo modificado
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)

            print(f"Procesado: {file_path}")

        except Exception as e:
            print(f"Error procesando {file_path}: {e}")

if __name__ == "__main__":
    replace_icons()