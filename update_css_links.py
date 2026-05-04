import os
import re

# List of HTML files
html_files = [
    'index.html',
    'productos.html',
    'producto.html',
    'sobreNosotros.html',
    'feriaTineo.html',
    'galeria.html',
    'carrito.html',
    'gracias-compra.html',
    'pago-exitoso.html',
    'politica-cookies.html',
    'politica-privacidad.html',
    'politica-devoluciones.html',
    'aviso-legal.html',
    'terminos-condiciones.html',
    'clear-cache.html'
]

for file in html_files:
    file_path = f'c:/Proyectos/NutriganV2/{file}'
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace style.css with style.min.css
        new_content = content.replace('href="style.css"', 'href="style.min.css"')

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"Updated {file}")
    except Exception as e:
        print(f"Error updating {file}: {e}")