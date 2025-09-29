# Nutrigan España - Sitio Web E-commerce

Sitio web oficial de Nutrigan España, especializado en productos para el bienestar animal. Incluye integración completa con Stripe para procesamiento de pagos.

## 🚀 Características

- **E-commerce completo** con carrito de compras
- **Integración con Stripe** para pagos seguros
- **Diseño responsive** optimizado para todos los dispositivos
- **Página de productos** con información detallada
- **Galería de imágenes** de eventos y productos
- **Sistema de checkout** con múltiples métodos de pago
- **Confirmación de pedidos** con detalles completos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js con Express.js
- **Pagos**: Stripe Checkout
- **Base de datos**: JSON (productos y multimedia)
- **Servidor**: Express.js con middleware CORS

## 📁 Estructura del Proyecto

```
nutrigan/
├── assets/                 # Imágenes y recursos estáticos
│   ├── multimedia/        # Imágenes adicionales
│   └── *.webp, *.jpg     # Imágenes de productos y UI
├── css/                   # Hojas de estilo
│   ├── *.min.css         # CSS minificado
│   └── *.css             # CSS personalizado
├── js/                    # Scripts JavaScript
│   ├── *.min.js          # JS minificado
│   └── *.js              # JS personalizado
├── docs/                  # Documentación PDF de productos
├── server.js              # Servidor Node.js
├── productos.json         # Base de datos de productos
├── multimedia.json        # Base de datos de multimedia
└── *.html                 # Páginas web
```

## 🔧 Instalación y Configuración

### Prerrequisitos

- Node.js (versión 14 o superior)
- npm o yarn
- Cuenta de Stripe (para pagos)

### Pasos de instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/AlexFerrandezWeb/NutriganEspa-a.git
   cd NutriganEspa-a
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crear un archivo `.env` en la raíz del proyecto:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLIC_KEY=pk_test_...
   PORT=3000
   ```

4. **Ejecutar el servidor**:
   ```bash
   npm start
   ```

5. **Acceder a la aplicación**:
   Abrir `http://localhost:3000` en el navegador

## 💳 Configuración de Stripe

Para habilitar los pagos, necesitarás:

1. Crear una cuenta en [Stripe](https://stripe.com)
2. Obtener las claves de API (test y live)
3. Configurar los webhooks si es necesario
4. Actualizar las URLs de éxito y cancelación

## 📱 Páginas Principales

- **Inicio** (`index.html`) - Página principal con productos destacados
- **Productos** (`producto.html`) - Detalles de productos individuales
- **Carrito** (`carrito.html`) - Gestión del carrito de compras
- **Checkout** (`checkout.html`) - Proceso de pago
- **Pago Exitoso** (`pago-exitoso.html`) - Confirmación de pedido
- **Galería** (`galeria.html`) - Imágenes de eventos y productos

## 🔒 Seguridad

- Las claves de Stripe están protegidas en variables de entorno
- El archivo `.env` está excluido del control de versiones
- Se utiliza HTTPS para todas las transacciones
- Validación de datos tanto en cliente como servidor

## 📞 Contacto

**Nutrigan España**
- 📍 C/El Cortin n°63, El Crucero - Tineo 33877 (Asturias)
- 📞 626 983 042
- ✉️ javiernutrigan@gmail.com
- 🌐 [Facebook](https://www.facebook.com/nutriganespana)

## 📄 Licencia

© 2025 Nutrigan España - Todos los derechos reservados

## 🤝 Contribuciones

Este es un proyecto privado de Nutrigan España. Para sugerencias o reportar problemas, contactar directamente con el equipo de desarrollo.

---

**Nota**: Este proyecto utiliza claves de prueba de Stripe. Para producción, asegúrate de cambiar a las claves live y configurar adecuadamente el entorno de producción.
