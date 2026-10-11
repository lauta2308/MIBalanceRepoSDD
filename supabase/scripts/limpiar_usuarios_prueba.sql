-- Borra los usuarios creados por las pruebas (marcados con es_prueba = true al iniciar la
-- sesión anónima). En cascada se borran sus cuentas, categorías y movimientos.
-- Se ejecuta en el SQL Editor de Supabase después de correr las pruebas.

WITH borrados AS (
  DELETE FROM auth.users
  WHERE raw_user_meta_data ->> 'es_prueba' = 'true'
  RETURNING id
)
SELECT count(*) AS usuarios_borrados FROM borrados;
