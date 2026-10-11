import { CargarMovimientos, ResponderError500, expect, test } from './ayudantes.js';

// AC-127 (parte de esta feature), FR-020, FR-024, FR-033: con el servidor respondiendo 500 se
// muestra el texto de la spec con cruz roja y sin detalles técnicos.

async function EsperarError(page, texto) {
  await expect(page.getByText(texto)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Error' })).toBeVisible();
  await expect(page.getByText('error interno simulado')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/P0001|PGRST|stack|SQL/);
}

const FilaConMonto = (page, monto) =>
  page.locator('.fila-movimiento').filter({ has: page.locator('.monto', { hasText: monto }) });

test.describe('fallas del servidor (US5)', () => {
  test('alta: error de FR-024 y el formulario queda abierto con los valores', async ({ page }) => {
    await page.route('**/rest/v1/rpc/basp_agregar_movimiento', ResponderError500);
    await page.goto('/movimientos/nuevo/gasto');
    await page.getByLabel('Monto').fill('1500');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await EsperarError(page, 'No se pudo registrar el gasto. Vuelva a intentarlo.');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByRole('heading', { name: 'Añadir Gasto' })).toBeVisible();
    await expect(page.getByLabel('Monto')).toHaveValue('1.500');
  });

  test('alta de ingreso: texto propio del ingreso', async ({ page }) => {
    await page.route('**/rest/v1/rpc/basp_agregar_movimiento', ResponderError500);
    await page.goto('/movimientos/nuevo/ingreso');
    await page.getByLabel('Monto').fill('10');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await EsperarError(page, 'No se pudo registrar el ingreso. Vuelva a intentarlo.');
  });

  test('edición: error de FR-024 y el formulario queda abierto con los valores', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, [{ tipo: 'GASTO', monto: '3000.00' }]);
    await page.route('**/rest/v1/rpc/basp_editar_movimiento', ResponderError500);
    await page.goto('/');
    await FilaConMonto(page, '-3.000,00').click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Monto').fill('2000');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await EsperarError(page, 'No se pudo actualizar el movimiento. Vuelva a intentarlo.');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
    await expect(page.getByLabel('Monto')).toHaveValue('2.000');
  });

  test('eliminación: error de FR-024, la confirmación sigue abierta y el movimiento no cambia', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, [{ tipo: 'INGRESO', monto: '1000.00' }]);
    await page.route('**/rest/v1/rpc/basp_eliminar_movimiento', ResponderError500);
    await page.goto('/');
    await FilaConMonto(page, '+1.000,00').click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await EsperarError(page, 'No se pudo eliminar el movimiento. Vuelva a intentarlo.');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('¿Está seguro que desea eliminar este movimiento?')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(FilaConMonto(page, '+1.000,00')).toHaveCount(1);
  });

  for (const [descripcion, patron] of [
    ['carga de la cuenta', '**/rest/v1/rpc/basp_obtener_cuenta'],
    ['carga de los movimientos', '**/rest/v1/bav_movimientos*'],
  ]) {
    test(`${descripcion}: error sin saldo ni lista y "Aceptar" reintenta`, async ({ page, usuarioPrueba }) => {
      await CargarMovimientos(usuarioPrueba, [{ tipo: 'INGRESO', monto: '250.00' }]);
      await page.route(patron, ResponderError500);
      await page.goto('/');
      await EsperarError(page, 'No se pudieron cargar los movimientos. Vuelva a intentarlo.');
      await expect(page.locator('.saldo')).toHaveCount(0);
      await expect(page.locator('.fila-movimiento')).toHaveCount(0);
      await expect(page.getByText('Aquí verá sus movimientos.')).toHaveCount(0);

      await page.unroute(patron);
      await page.getByRole('button', { name: 'Aceptar' }).click();
      await expect(page.locator('.saldo')).toBeVisible();
      await expect(FilaConMonto(page, '+250,00')).toHaveCount(1);
    });
  }

  test('carga de las categorías: error y "Aceptar" vuelve a la sección Cuenta', async ({ page }) => {
    await page.route('**/rest/v1/bat_categorias*', ResponderError500);
    await page.goto('/?pagina=1');
    await page.getByRole('button', { name: 'Añadir Gasto' }).click();
    await EsperarError(page, 'No se pudieron cargar las categorías. Vuelva a intentarlo.');
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
  });
});

// Sin la sesión inyectada: el navegador arranca sin sesión e inicia una anónima (FR-033).
test('falla del inicio de sesión: pantalla de error y "Aceptar" reintenta y entra a la cuenta', async ({ browser }) => {
  const contexto = await browser.newContext({ locale: 'es-AR' });
  const page = await contexto.newPage();
  let intentos = 0;
  await page.route('**/auth/v1/signup*', async (ruta) => {
    intentos += 1;
    if (intentos === 1) {
      await ResponderError500(ruta);
      return;
    }
    // El usuario que se crea queda marcado para el script de limpieza (constitución II).
    const cuerpo = ruta.request().postDataJSON() ?? {};
    cuerpo.data = { ...(cuerpo.data ?? {}), es_prueba: true };
    await ruta.continue({ postData: JSON.stringify(cuerpo) });
  });

  await page.goto('/');
  await EsperarError(page, 'No se pudo iniciar sesión. Vuelva a intentarlo.');
  await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Añadir Gasto' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
  await expect(page.getByText('USD 0,00')).toBeVisible();
  expect(intentos).toBe(2);
  await contexto.close();
});
