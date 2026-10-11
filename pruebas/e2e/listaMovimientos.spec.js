import {
  CargarMovimientos,
  EliminarMovimientoPorApi,
  ObtenerFechaLocal,
  expect,
  test,
} from './ayudantes.js';

// n ingresos de hoy con montos 1, 2, …, n (el último cargado, n, es el más reciente).
function IngresosNumerados(cantidad) {
  return Array.from({ length: cantidad }, (_, indice) => ({
    tipo: 'INGRESO',
    monto: `${indice + 1}.00`,
    fecha: ObtenerFechaLocal(0),
  }));
}

const Filas = (page) => page.locator('.fila-movimiento');

test.describe('lista de movimientos (US2)', () => {
  test.describe.configure({ timeout: 180000 });

  test('agrupa por fecha y ordena por fecha y momento del alta (AC-36, AC-UI-04, AC-UI-14)', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, [
      { tipo: 'GASTO', monto: '1500.00', fecha: '2026-09-17' },
      { tipo: 'INGRESO', monto: '50000.00', fecha: '2026-10-01' },
      { tipo: 'GASTO', monto: '800.00', fecha: '2026-10-01' },
      { tipo: 'INGRESO', monto: '520.50', fecha: '2026-09-17' },
    ]);
    await page.goto('/');

    const encabezados = page.locator('.grupo-fecha h2');
    await expect(encabezados).toHaveText(['01/10/2026', '17/09/2026']);

    const octubre = page.getByRole('region', { name: '01/10/2026' }).locator('.fila-movimiento');
    await expect(octubre.locator('.categoria')).toHaveText(['Pago Realizado', 'Pago Ingresado']);
    await expect(octubre.locator('.monto')).toHaveText(['-800,00', '+50.000,00']);

    const septiembre = page.getByRole('region', { name: '17/09/2026' }).locator('.fila-movimiento');
    await expect(septiembre.locator('.monto')).toHaveText(['+520,50', '-1.500,00']);
    // Sin tipo ni código de moneda en las filas.
    await expect(page.locator('.lista-movimientos')).not.toContainText('USD');
    await expect(page.locator('.lista-movimientos')).not.toContainText('Gasto');
  });

  test('con 120 movimientos pagina de a 50 y navega con "Siguiente" (AC-38, AC-39)', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, IngresosNumerados(120));
    await page.goto('/');

    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    await expect(Filas(page)).toHaveCount(50);
    await expect(Filas(page).first().locator('.monto')).toHaveText('+120,00');
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Página 2 de 3')).toBeVisible();
    await expect(page).toHaveURL(/\?pagina=2$/);
    await expect(Filas(page)).toHaveCount(50);
    await expect(Filas(page).first().locator('.monto')).toHaveText('+70,00');

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Página 3 de 3')).toBeVisible();
    await expect(Filas(page)).toHaveCount(20);
    await expect(Filas(page).last().locator('.monto')).toHaveText('+1,00');
    await expect(page.getByRole('button', { name: 'Siguiente' }).first()).toBeDisabled();

    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page.getByText('Página 2 de 3')).toBeVisible();
  });

  test('con 30 movimientos no hay paginación (AC-41)', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, IngresosNumerados(30));
    await page.goto('/');
    await expect(Filas(page)).toHaveCount(30);
    await expect(page.getByText(/Página \d+ de \d+/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Anterior' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Siguiente' })).toHaveCount(0);
  });

  test('desde la página 2, un alta vuelve a la página 1 con el nuevo primero (AC-40 alta); cancelar se queda en la página 2 (FR-021)', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, IngresosNumerados(120));
    await page.goto('/?pagina=2');
    await expect(page.getByText('Página 2 de 3')).toBeVisible();

    await page.getByRole('button', { name: 'Añadir Ingreso' }).click();
    await expect(page).toHaveURL(/\/movimientos\/nuevo\/ingreso\?pagina=2$/);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Página 2 de 3')).toBeVisible();

    await page.getByRole('button', { name: 'Añadir Gasto' }).click();
    await page.getByLabel('Monto').fill('5');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    await expect(Filas(page).first().locator('.monto')).toHaveText('-5,00');
  });

  test('si la página pedida queda vacía muestra la última con movimientos y corrige la dirección (FR-014)', async ({ page, usuarioPrueba }) => {
    const ids = await CargarMovimientos(usuarioPrueba, IngresosNumerados(51));
    await page.goto('/?pagina=2');
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    await expect(Filas(page)).toHaveCount(1);

    // El movimiento de la página 2 es el más antiguo (el primero cargado).
    await EliminarMovimientoPorApi(usuarioPrueba, ids[0]);
    await page.reload();

    await expect(Filas(page)).toHaveCount(50);
    await expect(page.getByText(/Página \d+ de \d+/)).toHaveCount(0);
    await expect(page).not.toHaveURL(/pagina=2/);
  });

  test('un número de página inválido muestra la página 1 y corrige la dirección', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, IngresosNumerados(3));
    await page.goto('/?pagina=abc');
    await expect(Filas(page)).toHaveCount(3);
    await expect(page).not.toHaveURL(/pagina=/);
  });
});
