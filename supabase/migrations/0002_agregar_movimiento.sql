-- 0002: alta de movimientos (US1). Atómica: bloquea la cuenta, valida, inserta y ajusta el
-- saldo en una sola transacción (research R4). Se ejecuta en el SQL Editor después de 0001.

BEGIN;

CREATE OR REPLACE FUNCTION public.BASP_AGREGAR_MOVIMIENTO(
  p_tipo text,
  p_monto numeric,
  p_id_categoria uuid,
  p_fecha date,
  p_simular_falla boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_cuenta uuid;
  v_id_movimiento uuid;
BEGIN
  -- Bloquea la cuenta del usuario: serializa sus operaciones simultáneas (FR-004).
  SELECT c.id INTO v_id_cuenta
  FROM public.BAT_CUENTAS c
  WHERE c.id_usuario = auth.uid()
  FOR UPDATE;

  IF v_id_cuenta IS NULL THEN
    RAISE EXCEPTION 'SIN_CUENTA';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('INGRESO', 'GASTO') THEN
    RAISE EXCEPTION 'TIPO_INVALIDO';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_NO_POSITIVO';
  END IF;

  IF p_monto > 999999999999.99 THEN
    RAISE EXCEPTION 'MONTO_MAXIMO';
  END IF;

  IF p_monto <> round(p_monto, 2) THEN
    RAISE EXCEPTION 'MONTO_DECIMALES';
  END IF;

  -- Hasta mañana en UTC: cubre el "hoy" de todas las zonas horarias.
  IF p_fecha IS NULL OR p_fecha > (now() AT TIME ZONE 'UTC')::date + 1 THEN
    RAISE EXCEPTION 'FECHA_INVALIDA';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.BAT_CATEGORIAS cat
    WHERE cat.id = p_id_categoria
      AND cat.id_cuenta = v_id_cuenta
      AND cat.tipo = p_tipo
  ) THEN
    RAISE EXCEPTION 'CATEGORIA_INVALIDA';
  END IF;

  INSERT INTO public.BAT_MOVIMIENTOS (id_cuenta, id_categoria, tipo, monto, fecha)
  VALUES (v_id_cuenta, p_id_categoria, p_tipo, p_monto, p_fecha)
  RETURNING id INTO v_id_movimiento;

  -- Solo para pruebas (research R9): falla entre el movimiento y el saldo.
  IF p_simular_falla THEN
    RAISE EXCEPTION 'FALLA_SIMULADA';
  END IF;

  UPDATE public.BAT_CUENTAS
  SET saldo = saldo + CASE WHEN p_tipo = 'INGRESO' THEN p_monto ELSE -p_monto END
  WHERE id = v_id_cuenta;

  RETURN v_id_movimiento;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.BASP_AGREGAR_MOVIMIENTO(text, numeric, uuid, date, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.BASP_AGREGAR_MOVIMIENTO(text, numeric, uuid, date, boolean)
  TO authenticated;

COMMIT;
