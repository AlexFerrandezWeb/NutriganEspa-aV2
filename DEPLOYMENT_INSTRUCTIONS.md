# 🚀 Instrucciones de Despliegue en Render

## 📋 Pasos para Desplegar en Render

### 1. Preparar el Repositorio
- ✅ El código ya está listo para producción
- ✅ `render.yaml` configurado correctamente
- ✅ `package.json` con scripts de inicio
- ✅ Variables de entorno preparadas

### 2. Crear Cuenta en Render
1. Ve a [render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub
3. Conecta tu repositorio de GitHub

### 3. Configurar el Servicio Web
1. En el dashboard de Render, haz clic en "New +"
2. Selecciona "Web Service"
3. Conecta tu repositorio de GitHub
4. Render detectará automáticamente el archivo `render.yaml`

### 4. Configurar Variables de Entorno
En la sección "Environment Variables" de Render, añade:

```
NODE_ENV = production
STRIPE_SECRET_KEY = sk_live_tu_clave_secreta_de_stripe
STRIPE_PUBLIC_KEY = pk_live_tu_clave_publica_de_stripe
```

**⚠️ IMPORTANTE**: 
- Usa las claves **LIVE** de Stripe (que empiecen con `sk_live_` y `pk_live_`)
- NO uses las claves de prueba (que empiecen con `sk_test_` y `pk_test_`)
- Las claves de prueba no funcionarán en producción

### 5. Configuración del Servicio
- **Name**: `nutrigan-web`
- **Environment**: `Node`
- **Plan**: `Free` (para empezar)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/test`

### 6. Desplegar
1. Haz clic en "Create Web Service"
2. Render comenzará a construir y desplegar tu aplicación
3. El proceso tomará 2-3 minutos

### 7. Verificar el Despliegue
Una vez desplegado, tendrás una URL como:
`https://nutrigan-web.onrender.com`

Prueba estos endpoints:
- `https://nutrigan-web.onrender.com/api/test` - Health check
- `https://nutrigan-web.onrender.com/` - Página principal

## 🔧 Configuración Post-Despliegue

### Actualizar URLs en el Frontend
Después del despliegue, necesitarás actualizar las URLs en tu frontend para que apunten a Render en lugar de localhost.

### Configurar Dominio Personalizado (Opcional)
1. En Render, ve a tu servicio
2. En "Settings" > "Custom Domains"
3. Añade tu dominio personalizado
4. Configura los registros DNS según las instrucciones

## 📊 Monitoreo
- Render proporciona logs en tiempo real
- Monitoreo de rendimiento incluido
- Alertas automáticas si el servicio se cae

## 💰 Costos
- **Plan Free**: 750 horas/mes gratis
- **Plan Starter**: $7/mes para uso ilimitado
- **Plan Professional**: $25/mes con más recursos

## 🚨 Importante
- El plan gratuito puede "dormir" después de 15 minutos de inactividad
- El primer request después de dormir puede tardar 30 segundos
- Para producción, considera el plan de pago

## ✅ Checklist de Despliegue
- [ ] Código subido a GitHub
- [ ] Cuenta de Render creada
- [ ] Servicio web configurado
- [ ] Variables de entorno añadidas
- [ ] Despliegue completado
- [ ] Health check funcionando
- [ ] URLs actualizadas en frontend
- [ ] Pruebas de pago realizadas

## 🆘 Solución de Problemas
Si hay problemas:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Asegúrate de que el puerto sea dinámico (usar `process.env.PORT`)
4. Comprueba que todas las dependencias estén en `package.json`
