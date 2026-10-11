-- 0003: edición de movimientos (US3), incluido el cambio de tipo. Atómica: bloquea la cuenta y
-- el movimiento, valida, actualiza y ajusta el saldo con un delta (data-model.md).
-- Se ejecuta en el SQL Editor después de 0002.

BEGIN;

CREATE OR REPLACE FUNCTION public.BASP_EDITAR_MOVIMIENTO(
  p_id_movimiento uuid,
  p_tipo text,
  p_monto numeric,
  p_id_categoria uuid,
  p_fecha date,
  p_simular_falla boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_cuenta uuid;
  v_tipo_anterior text;
  v_monto_anterior numeric;
BEGIN
  SELECT c.id INTO v_id_cuenta
  FROM public.BAT_CUENTAS c
  WHERE c.id_usuario = auth.uid()
  FOR UPDATE;

  IF v_id_cuenta IS NULL THEN
    RAISE EXCEPTION 'SIN_CUENTA';
  END IF;

  -- Solo movimientos de la cuenta del usuario (FR-025).
  SELECT m.tipo, m.monto INTO v_tipo_anterior, v_monto_anterior
  FROM public.BAT_MOVIMIENTOS m
  WHERE m.id = p_id_movimiento
    AND m.id_cuenta = v_id_cuenta
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MOVIMIENTO_INEXISTENTE';
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

  -- creado_en no se toca: editar no cambia el orden de la lista (FR-011).
  UPDATE public.BAT_MOVIMIENTOS
  SET tipo = p_tipo,
      monto = p_monto,
      id_categoria = p_id_categoria,
      fecha = p_fecha
  WHERE id = p_id_movimiento;

  IF p_simular_falla THEN
    RAISE EXCEPTION 'FALLA_SIMULADA';
  END IF;

  -- Delta: −signo(tipo₀)·m₀ + signo(tipo₁)·m₁
  UPDATE public.BAT_CUENTAS
  SET saldo = saldo
    - CASE WHEN v_tipo_anterior = 'INGRESO' THEN v_monto_anterior ELSE -v_monto_anterior END
    + CASE WHEN p_tipo = 'INGRESO' THEN p_monto ELSE -p_monto END
  WHERE id = v_id_cuenta;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.BASP_EDITAR_MOVIMIENTO(uuid, text, numeric, uuid, date, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.BASP_EDITAR_MOVIMIENTO(uuid, text, numeric, uuid, date, boolean)
  TO authenticated;

COMMIT;
