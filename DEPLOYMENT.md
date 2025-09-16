# Instrucciones de Despliegue en Render

## Configuración Actual

La aplicación ya está configurada para funcionar en Render. Los cambios realizados incluyen:

### 1. Configuración del Servidor (server.js)
- ✅ Configurado para escuchar en todas las interfaces (`0.0.0.0`)
- ✅ CORS configurado para incluir `https://nutrigan-web.onrender.com`
- ✅ URLs dinámicas para Stripe (funcionan automáticamente en cualquier dominio)
- ✅ Middleware de debug reorganizado para evitar errores 405

### 2. Configuración de Render (render.yaml)
- ✅ Plan gratuito configurado
- ✅ Variables de entorno configuradas
- ✅ Health check en `/api/test`
- ✅ Auto-deploy habilitado

### 3. Variables de Entorno Necesarias en Render
Asegúrate de configurar estas variables en el dashboard de Render:

```
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_... (tu clave secreta de producción)
STRIPE_PUBLIC_KEY=pk_live_... (tu clave pública de producción)
```

### 4. Pasos para Desplegar

1. **Conecta tu repositorio a Render:**
   - Ve a https://render.com
   - Crea una nueva Web Service
   - Conecta tu repositorio de GitHub

2. **Configura las variables de entorno:**
   - En el dashboard de Render, ve a Environment
   - Añade las variables de Stripe (usa las de producción)

3. **Despliega:**
   - Render detectará automáticamente el `render.yaml`
   - La aplicación se desplegará automáticamente

### 5. URLs de la Aplicación

Una vez desplegada, tu aplicación estará disponible en:
- **URL principal:** `https://nutrigan-web.onrender.com`
- **API de prueba:** `https://nutrigan-web.onrender.com/api/test`
- **Health check:** `https://nutrigan-web.onrender.com/api/test`

### 6. Verificación

Para verificar que todo funciona:

1. Visita `https://nutrigan-web.onrender.com/api/test`
2. Deberías ver una respuesta JSON con `success: true`
3. Prueba el flujo de compra completo

### 7. Notas Importantes

- ✅ Las URLs de Stripe se generan dinámicamente
- ✅ CORS está configurado para el dominio de Render
- ✅ El error 405 Method Not Allowed está corregido
- ✅ La aplicación funciona tanto en localhost como en Render

## Solución de Problemas

Si encuentras algún problema:

1. **Error 405 Method Not Allowed:** Ya está corregido
2. **CORS errors:** Verifica que el dominio esté en la lista de orígenes permitidos
3. **Stripe errors:** Verifica que las claves de API estén configuradas correctamente
4. **Health check fails:** Verifica que el servidor esté respondiendo en `/api/test`
