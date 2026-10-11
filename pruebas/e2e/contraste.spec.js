import AxeBuilder from '@axe-core/playwright';
import { CargarMovimientos, expect, test } from './ayudantes.js';

// SC-008, UI-16: sin violaciones de contraste en cada pantalla y estado.
async function EsperarSinProblemasDeContraste(page, descripcion) {
  const resultado = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const problemas = resultado.violations.flatMap((violacion) =>
    violacion.nodes.map((nodo) => `${nodo.target.join(' ')}: ${nodo.failureSummary}`),
  );
  expect(problemas, descripcion).toEqual([]);
}

// Demora las respuestas que coinciden para poder analizar los estados "Cargando…",
// "Guardando…" y "Eliminando…". Devuelve una función que las deja pasar.
async function Demorar(page, patron) {
  let liberar;
  const liberacion = new Promise((resolver) => {
    liberar = resolver;
  });
  await page.route(patron, async (ruta) => {
    await liberacion;
    await ruta.continue().catch(() => {});
  });
  return () => liberar();
}

test.describe('contraste (US5 / SC-008)', () => {
  test.describe.configure({ timeout: 120000 });

  test('sección Cuenta vacía y cargando', async ({ page }) => {
    const liberar = await Demorar(page, '**/rest/v1/rpc/basp_obtener_cuenta');
    await page.goto('/');
    await expect(page.getByText('Cargando…')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'cargando');
    liberar();
    await expect(page.getByText('Aquí verá sus movimientos.')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'vacía');
  });

  test('sección Cuenta con lista, paginación, menú y confirmación', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, [
      ...Array.from({ length: 50 }, () => ({ tipo: 'INGRESO', monto: '10.00', fecha: '2026-01-10' })),
      { tipo: 'GASTO', monto: '1500.00' },
    ]);
    await page.goto('/');
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'lista');

    await page.locator('.fila-movimiento').first().click();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'menú de fila');

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('¿Está seguro que desea eliminar este movimiento?')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'confirmación');

    const liberar = await Demorar(page, '**/rest/v1/rpc/basp_eliminar_movimiento');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('button', { name: 'Eliminando…' })).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'eliminando');
    liberar();
    await expect(page.getByText('Movimiento eliminado con éxito.')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'mensaje de éxito');
  });

  test('formularios de alta y edición, calendario, guardando y mensaje de error', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, [{ tipo: 'GASTO', monto: '300.00' }]);
    await page.goto('/movimientos/nuevo/gasto');
    await expect(page.getByRole('heading', { name: 'Añadir Gasto' })).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'formulario de alta');

    await page.getByRole('button', { name: /Fecha/ }).click();
    await expect(page.locator('.calendario')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'calendario abierto');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('El monto debe ser mayor a 0.')).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'mensaje de error');
    await page.getByRole('button', { name: 'Aceptar' }).click();

    const liberar = await Demorar(page, '**/rest/v1/rpc/basp_agregar_movimiento');
    await page.getByLabel('Monto').fill('10');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('button', { name: 'Guardando…' })).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'guardando');
    liberar();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await page.locator('.fila-movimiento').first().click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
    await EsperarSinProblemasDeContraste(page, 'formulario de edición');
  });
});

// Sin sesión y sin dejar pasar ningún intento de inicio de sesión: no se crea ningún usuario.
test('pantalla de error de sesión', async ({ browser }) => {
  const contexto = await browser.newContext({ locale: 'es-AR' });
  const page = await contexto.newPage();
  await page.route('**/auth/v1/signup*', (ruta) =>
    ruta.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"falla simulada"}' }),
  );
  await page.goto('/');
  await expect(page.getByText('No se pudo iniciar sesión. Vuelva a intentarlo.')).toBeVisible();
  await EsperarSinProblemasDeContraste(page, 'error de sesión');
  await contexto.close();
});
