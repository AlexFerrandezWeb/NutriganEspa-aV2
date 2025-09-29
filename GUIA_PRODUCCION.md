# 🚀 Guía de Producción - Nutrigan España

## ✅ Estado del Despliegue

Tu aplicación está desplegada en Render con el ID: `srv-d33u9ii4d50c73ejcn5g`
- **URL de producción**: https://nutrigan-web.onrender.com
- **Estado**: Desplegado y configurado

## 🔧 Configuración Actual

### Variables de Entorno Configuradas:
- ✅ `NODE_ENV = production`
- ✅ `STRIPE_SECRET_KEY = [Configurada]`
- ✅ `STRIPE_PUBLIC_KEY = [Configurada]`

### Características Implementadas:
- ✅ Servidor Node.js con Express
- ✅ Integración completa con Stripe
- ✅ CORS configurado para producción
- ✅ Imágenes optimizadas para Stripe
- ✅ Health check en `/api/test`

## 🧪 Cómo Probar la Aplicación

### 1. Acceder a la Aplicación
```
https://nutrigan-web.onrender.com
```

**Nota**: El primer acceso puede tardar 30-60 segundos porque Render activa el servicio automáticamente.

### 2. Probar el Flujo de Pago
1. **Añadir productos al carrito** desde la página principal
2. **Ir al carrito** haciendo clic en el icono del carrito
3. **Hacer clic en "Finalizar compra"**
4. **Verificar que te redirige a Stripe** con las imágenes de los productos

### 3. Verificar Funcionalidades
- ✅ **Búsqueda de productos**: Funciona en tiempo real
- ✅ **Carrito de compras**: Añadir, eliminar, modificar cantidades
- ✅ **Imágenes en Stripe**: Se muestran correctamente
- ✅ **Responsive**: Funciona en móvil y desktop

## 🔍 Endpoints de la API

### Health Check
```
GET https://nutrigan-web.onrender.com/api/test
```
**Respuesta esperada**: `{"status": "ok", "message": "Servidor funcionando"}`

### Crear Sesión de Stripe
```
POST https://nutrigan-web.onrender.com/api/crear-sesion-stripe
Content-Type: application/json

{
  "productos": [
    {
      "id": "2",
      "nombre": "Bolutech activ",
      "precio": 44.3,
      "precioFinal": 48.73,
      "cantidad": 1,
      "imagen": "/assets/producto2.webp"
    }
  ],
  "total": 48.73,
  "moneda": "eur"
}
```

## 🚨 Solución de Problemas

### Si la página no carga:
1. **Espera 30-60 segundos** (Render activa el servicio automáticamente)
2. **Refresca la página** después del tiempo de espera
3. **Verifica que la URL sea correcta**: `https://nutrigan-web.onrender.com`

### Si Stripe no funciona:
1. **Verifica las claves de Stripe** en el dashboard de Render
2. **Asegúrate de usar claves LIVE** (no de prueba)
3. **Revisa los logs** en el dashboard de Render

### Si las imágenes no se ven en Stripe:
- ✅ **En desarrollo**: Usa imágenes placeholder de Stripe
- ✅ **En producción**: Usa las imágenes reales de los productos

## 📊 Monitoreo

### Dashboard de Render:
1. Ve a [render.com](https://render.com)
2. Inicia sesión en tu cuenta
3. Busca el servicio con ID: `srv-d33u9ii4d50c73ejcn5g`
4. Revisa los logs y métricas

### Logs Importantes:
- ✅ **Servidor iniciado**: "Servidor corriendo en puerto XXXX"
- ✅ **CORS configurado**: "Configurado para funcionar en Render"
- ✅ **Stripe funcionando**: "Sesión de Stripe creada exitosamente"

## 🎯 Próximos Pasos

1. **Probar la aplicación** accediendo a la URL de producción
2. **Verificar el flujo de pago** completo
3. **Configurar dominio personalizado** (opcional)
4. **Configurar SSL** (ya incluido en Render)

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en el dashboard de Render
2. Verifica que las variables de entorno estén configuradas
3. Asegúrate de que las claves de Stripe sean correctas

---

**¡Tu aplicación está lista para funcionar 24/7!** 🎉
