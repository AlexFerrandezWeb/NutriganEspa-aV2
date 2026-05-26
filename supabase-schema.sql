-- =====================================================
-- NUTRIGAN ESPAÑA — Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. TABLA DE PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
  id                 INTEGER PRIMARY KEY,
  nombre             TEXT NOT NULL,
  descripcion        TEXT,
  descripcion_completa TEXT,
  precio             DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_unitario    DECIMAL(10,2),
  cantidad_minima    INTEGER DEFAULT 1,
  moneda             TEXT DEFAULT 'EUR',
  imagen             TEXT,
  categoria          TEXT,
  especie            TEXT,
  etapa              TEXT,
  tiempo_liberacion  TEXT,
  presentacion       TEXT,
  peso               TEXT,
  ingredientes       TEXT[] DEFAULT ARRAY[]::TEXT[],
  beneficios         TEXT[] DEFAULT ARRAY[]::TEXT[],
  formato            TEXT,
  composicion        TEXT,
  certificaciones    TEXT,
  temperatura        TEXT,
  ficha_tecnica      TEXT,
  stock              INTEGER DEFAULT 0,
  destacado          BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS productos_updated_at ON productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Lectura pública (cualquiera puede ver los productos)
DROP POLICY IF EXISTS "Lectura pública" ON productos;
CREATE POLICY "Lectura pública" ON productos
  FOR SELECT USING (true);

-- Solo usuarios autenticados pueden insertar
DROP POLICY IF EXISTS "Admin puede insertar" ON productos;
CREATE POLICY "Admin puede insertar" ON productos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Solo usuarios autenticados pueden actualizar
DROP POLICY IF EXISTS "Admin puede actualizar" ON productos;
CREATE POLICY "Admin puede actualizar" ON productos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Solo usuarios autenticados pueden eliminar
DROP POLICY IF EXISTS "Admin puede eliminar" ON productos;
CREATE POLICY "Admin puede eliminar" ON productos
  FOR DELETE USING (auth.role() = 'authenticated');


-- 3. STORAGE — Bucket para imágenes de productos
-- =====================================================
-- Crear bucket "imagenes" (acceso público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  5242880,  -- 5MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "Imagenes públicas" ON storage.objects;
CREATE POLICY "Imagenes públicas" ON storage.objects
  FOR SELECT USING (bucket_id = 'imagenes');

DROP POLICY IF EXISTS "Admin puede subir imágenes" ON storage.objects;
CREATE POLICY "Admin puede subir imágenes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'imagenes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin puede actualizar imágenes" ON storage.objects;
CREATE POLICY "Admin puede actualizar imágenes" ON storage.objects
  FOR UPDATE USING (bucket_id = 'imagenes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin puede eliminar imágenes" ON storage.objects;
CREATE POLICY "Admin puede eliminar imágenes" ON storage.objects
  FOR DELETE USING (bucket_id = 'imagenes' AND auth.role() = 'authenticated');
