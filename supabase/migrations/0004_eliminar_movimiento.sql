-- 0004: eliminación de movimientos (US4). Atómica: bloquea la cuenta, borra el movimiento y
-- ajusta el saldo con un delta (data-model.md). Se ejecuta en el SQL Editor después de 0003.

BEGIN;

CREATE OR REPLACE FUNCTION public.BASP_ELIMINAR_MOVIMIENTO(
  p_id_movimiento uuid,
  p_simular_falla boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id_cuenta uuid;
  v_tipo text;
  v_monto numeric;
BEGIN
  SELECT c.id INTO v_id_cuenta
  FROM public.BAT_CUENTAS c
  WHERE c.id_usuario = auth.uid()
  FOR UPDATE;

  IF v_id_cuenta IS NULL THEN
    RAISE EXCEPTION 'SIN_CUENTA';
  END IF;

  -- Solo movimientos de la cuenta del usuario (FR-025).
  DELETE FROM public.BAT_MOVIMIENTOS m
  WHERE m.id = p_id_movimiento
    AND m.id_cuenta = v_id_cuenta
  RETURNING m.tipo, m.monto INTO v_tipo, v_monto;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MOVIMIENTO_INEXISTENTE';
  END IF;

  IF p_simular_falla THEN
    RAISE EXCEPTION 'FALLA_SIMULADA';
  END IF;

  -- Delta: −signo(tipo)·m
  UPDATE public.BAT_CUENTAS
  SET saldo = saldo - CASE WHEN v_tipo = 'INGRESO' THEN v_monto ELSE -v_monto END
  WHERE id = v_id_cuenta;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.BASP_ELIMINAR_MOVIMIENTO(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.BASP_ELIMINAR_MOVIMIENTO(uuid, boolean) TO authenticated;

COMMIT;
