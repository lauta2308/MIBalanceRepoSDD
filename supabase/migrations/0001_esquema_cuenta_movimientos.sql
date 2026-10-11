-- 0001: esquema común de la feature 001 (Cuenta y Movimientos).
-- Tablas, índices, RLS, permisos, alta automática de la cuenta, vista de movimientos y
-- BASP_OBTENER_CUENTA. Se ejecuta una sola vez, completo, en el SQL Editor de Supabase.

BEGIN;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.BAT_CUENTAS (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  nombre varchar(30) NOT NULL DEFAULT 'Mi Cuenta',
  codigo_moneda char(3) NOT NULL DEFAULT 'USD',
  saldo numeric NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT BAPK_CUENTAS PRIMARY KEY (id),
  CONSTRAINT BAFK_CUENTAS_USUARIO FOREIGN KEY (id_usuario)
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT BAUQ_CUENTAS_USUARIO UNIQUE (id_usuario),
  CONSTRAINT BACK_CUENTAS_NOMBRE_VALIDO CHECK (nombre = btrim(nombre) AND nombre <> ''),
  CONSTRAINT BACK_CUENTAS_CODIGO_MONEDA CHECK (codigo_moneda ~ '^[A-Z]{3}$'),
  CONSTRAINT BACK_CUENTAS_SALDO_DOS_DECIMALES CHECK (saldo = round(saldo, 2))
);

CREATE TABLE IF NOT EXISTS public.BAT_CATEGORIAS (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_cuenta uuid NOT NULL,
  nombre varchar(30) NOT NULL,
  tipo text NOT NULL,
  es_por_defecto boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT BAPK_CATEGORIAS PRIMARY KEY (id),
  CONSTRAINT BAFK_CATEGORIAS_CUENTA FOREIGN KEY (id_cuenta)
    REFERENCES public.BAT_CUENTAS (id) ON DELETE CASCADE,
  CONSTRAINT BACK_CATEGORIAS_NOMBRE_VALIDO CHECK (nombre = btrim(nombre) AND nombre <> ''),
  CONSTRAINT BACK_CATEGORIAS_TIPO CHECK (tipo IN ('INGRESO', 'GASTO')),
  CONSTRAINT BAUQ_CATEGORIAS_ID_CUENTA_TIPO UNIQUE (id, id_cuenta, tipo)
);

-- Exactamente una categoría por defecto por tipo en cada cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS BAIX_CATEGORIAS_POR_DEFECTO
  ON public.BAT_CATEGORIAS (id_cuenta, tipo)
  WHERE es_por_defecto;

CREATE TABLE IF NOT EXISTS public.BAT_MOVIMIENTOS (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_cuenta uuid NOT NULL,
  id_categoria uuid NOT NULL,
  tipo text NOT NULL,
  monto numeric(14, 2) NOT NULL,
  fecha date NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT BAPK_MOVIMIENTOS PRIMARY KEY (id),
  CONSTRAINT BAFK_MOVIMIENTOS_CUENTA FOREIGN KEY (id_cuenta)
    REFERENCES public.BAT_CUENTAS (id) ON DELETE CASCADE,
  -- La categoría es de la misma cuenta y del mismo tipo que el movimiento. NO ACTION (y no
  -- RESTRICT) para que el borrado en cascada de un usuario pueda borrar en la misma sentencia
  -- sus categorías y sus movimientos; igual impide borrar una categoría con movimientos.
  CONSTRAINT BAFK_MOVIMIENTOS_CATEGORIA FOREIGN KEY (id_categoria, id_cuenta, tipo)
    REFERENCES public.BAT_CATEGORIAS (id, id_cuenta, tipo)
    ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT BACK_MOVIMIENTOS_TIPO CHECK (tipo IN ('INGRESO', 'GASTO')),
  CONSTRAINT BACK_MOVIMIENTOS_MONTO_POSITIVO CHECK (monto > 0),
  CONSTRAINT BACK_MOVIMIENTOS_MONTO_MAXIMO CHECK (monto <= 999999999999.99)
);

CREATE INDEX IF NOT EXISTS BAIX_MOVIMIENTOS_CUENTA_FECHA
  ON public.BAT_MOVIMIENTOS (id_cuenta, fecha DESC, creado_en DESC, id DESC);

CREATE INDEX IF NOT EXISTS BAIX_MOVIMIENTOS_CATEGORIA
  ON public.BAT_MOVIMIENTOS (id_categoria);

-- ---------------------------------------------------------------------------
-- Seguridad: RLS de solo lectura; ninguna escritura directa desde el cliente
-- ---------------------------------------------------------------------------

ALTER TABLE public.BAT_CUENTAS ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.BAT_CATEGORIAS ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.BAT_MOVIMIENTOS ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.BAT_CUENTAS, public.BAT_CATEGORIAS, public.BAT_MOVIMIENTOS
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.BAT_CUENTAS, public.BAT_CATEGORIAS, public.BAT_MOVIMIENTOS
  TO authenticated;

DROP POLICY IF EXISTS BAPOL_CUENTAS_PROPIETARIO ON public.BAT_CUENTAS;
CREATE POLICY BAPOL_CUENTAS_PROPIETARIO ON public.BAT_CUENTAS
  FOR SELECT TO authenticated
  USING (id_usuario = (SELECT auth.uid()));

DROP POLICY IF EXISTS BAPOL_CATEGORIAS_PROPIETARIO ON public.BAT_CATEGORIAS;
CREATE POLICY BAPOL_CATEGORIAS_PROPIETARIO ON public.BAT_CATEGORIAS
  FOR SELECT TO authenticated
  USING (
    id_cuenta IN (
      SELECT c.id FROM public.BAT_CUENTAS c WHERE c.id_usuario = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS BAPOL_MOVIMIENTOS_PROPIETARIO ON public.BAT_MOVIMIENTOS;
CREATE POLICY BAPOL_MOVIMIENTOS_PROPIETARIO ON public.BAT_MOVIMIENTOS
  FOR SELECT TO authenticated
  USING (
    id_cuenta IN (
      SELECT c.id FROM public.BAT_CUENTAS c WHERE c.id_usuario = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Alta automática de la cuenta y sus categorías por defecto (FR-001)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.BATF_CREAR_CUENTA_USUARIO()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_cuenta uuid;
BEGIN
  INSERT INTO public.BAT_CUENTAS (id_usuario)
  VALUES (NEW.id)
  RETURNING id INTO v_id_cuenta;

  INSERT INTO public.BAT_CATEGORIAS (id_cuenta, nombre, tipo, es_por_defecto)
  VALUES
    (v_id_cuenta, 'Pago Realizado', 'GASTO', true),
    (v_id_cuenta, 'Pago Ingresado', 'INGRESO', true);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.BATF_CREAR_CUENTA_USUARIO() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS BATR_CREAR_CUENTA_USUARIO ON auth.users;
CREATE TRIGGER BATR_CREAR_CUENTA_USUARIO
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.BATF_CREAR_CUENTA_USUARIO();

-- ---------------------------------------------------------------------------
-- Vista de la lista: respeta el RLS de quien consulta; montos como texto (research R3)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.BAV_MOVIMIENTOS
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.id_cuenta,
  m.tipo,
  m.fecha,
  m.creado_en,
  m.id_categoria,
  m.monto::text AS monto,
  c.nombre AS nombre_categoria
FROM public.BAT_MOVIMIENTOS m
JOIN public.BAT_CATEGORIAS c ON c.id = m.id_categoria;

REVOKE ALL ON public.BAV_MOVIMIENTOS FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.BAV_MOVIMIENTOS TO authenticated;

-- ---------------------------------------------------------------------------
-- Lectura de la cuenta con el saldo como texto con dos decimales ("0.00", "-1500.00")
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.BASP_OBTENER_CUENTA()
RETURNS TABLE (id uuid, nombre varchar, codigo_moneda char(3), saldo text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id, c.nombre, c.codigo_moneda, round(c.saldo, 2)::text
  FROM public.BAT_CUENTAS c
  WHERE c.id_usuario = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.BASP_OBTENER_CUENTA() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.BASP_OBTENER_CUENTA() TO authenticated;

COMMIT;
