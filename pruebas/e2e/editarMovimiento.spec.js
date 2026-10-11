import {
  CargarMovimientos,
  EliminarMovimientoPorApi,
  EstablecerSaldo,
  ObtenerFechaLocal,
  expect,
  test,
} from './ayudantes.js';

const Filas = (page) => page.locator('.fila-movimiento');
const FilaConMonto = (page, monto) => Filas(page).filter({ has: page.locator('.monto', { hasText: monto }) });

// Saldo de 10.000 que incluye un gasto de 3.000 del 17/09/2026; devuelve su id.
async function PrepararGastoDe3000(usuarioPrueba) {
  await EstablecerSaldo(usuarioPrueba, '13000.00');
  const [id] = await CargarMovimientos(usuarioPrueba, [{ tipo: 'GASTO', monto: '3000.00', fecha: '2026-09-17' }]);
  return id;
}

async function AbrirEdicion(page, monto) {
  await FilaConMonto(page, monto).click();
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
}

function IngresosNumerados(cantidad) {
  return Array.from({ length: cantidad }, (_, indice) => ({
    tipo: 'INGRESO',
    monto: `${indice + 1}.00`,
    fecha: ObtenerFechaLocal(0),
  }));
}

test.describe('editar un movimiento (US3)', () => {
  test.describe.configure({ timeout: 180000 });

  test('tocar la fila abre el menú "Editar"/"Eliminar" y se cierra tocando fuera (AC-69)', async ({ page, usuarioPrueba }) => {
    await PrepararGastoDe3000(usuarioPrueba);
    await page.goto('/');
    await FilaConMonto(page, '-3.000,00').click();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(page.getByRole('button', { name: 'Editar' })).toBeHidden();
  });

  test('el formulario muestra los valores guardados y el calendario la fecha guardada (AC-60, AC-61, AC-66, AC-70)', async ({ page, usuarioPrueba }) => {
    await PrepararGastoDe3000(usuarioPrueba);
    await page.goto('/');
    await AbrirEdicion(page, '-3.000,00');
    await expect(page.getByLabel('Monto')).toHaveValue('3.000,00');
    await expect(page.getByLabel('Tipo')).toHaveValue('GASTO');
    await expect(page.getByLabel('Categoría').locator('option:checked')).toHaveText('Pago Realizado');
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);

    await page.getByRole('button', { name: /Fecha/ }).click();
    await expect(page.locator('.calendario [data-day="2026-09-17"] button')).toHaveAttribute('aria-label', /seleccionado$/);
  });

  test('cambia monto y fecha: lista bajo 16/09/2026 con "-2.000,00" y saldo 11.000 (AC-62 sin el cambio de categoría)', async ({ page, usuarioPrueba }) => {
    await PrepararGastoDe3000(usuarioPrueba);
    await page.goto('/');
    await AbrirEdicion(page, '-3.000,00');
    await page.getByLabel('Monto').fill('2000');
    await page.getByRole('button', { name: /Fecha/ }).click();
    await page.locator('.calendario [data-day="2026-09-16"] button').click();
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Movimiento actualizado con éxito.')).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('USD 11.000,00')).toBeVisible();
    const grupo = page.getByRole('region', { name: '16/09/2026' });
    await expect(grupo.locator('.monto')).toHaveText(['-2.000,00']);
    await expect(page.getByRole('region', { name: '17/09/2026' })).toHaveCount(0);
  });

  test('cambia un gasto a ingreso: "Pago Ingresado", "+3.000,00" y saldo 16.000 (AC-63)', async ({ page, usuarioPrueba }) => {
    await PrepararGastoDe3000(usuarioPrueba);
    await page.goto('/');
    await AbrirEdicion(page, '-3.000,00');
    await page.getByLabel('Tipo').selectOption('INGRESO');
    await expect(page.getByLabel('Categoría').locator('option:checked')).toHaveText('Pago Ingresado');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByText('USD 16.000,00')).toBeVisible();
    const fila = FilaConMonto(page, '+3.000,00');
    await expect(fila.locator('.categoria')).toHaveText('Pago Ingresado');
  });

  for (const formaDeCancelar of ['Cancelar', 'Volver']) {
    test(`"${formaDeCancelar}" no guarda y al reabrir se ven los valores guardados (AC-06, AC-67, AC-97)`, async ({ page, usuarioPrueba }) => {
      await PrepararGastoDe3000(usuarioPrueba);
      await page.goto('/');
      await AbrirEdicion(page, '-3.000,00');
      await page.getByLabel('Monto').fill('2000');
      await page.getByRole('button', { name: formaDeCancelar }).click();

      await expect(page.getByText('USD 10.000,00')).toBeVisible();
      await AbrirEdicion(page, '-3.000,00');
      await expect(page.getByLabel('Monto')).toHaveValue('3.000,00');
    });
  }

  test('con 120 movimientos: cancelar desde la página 2 vuelve a la página 2 y guardar vuelve a la página 1 (FR-021, AC-40 edición)', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(usuarioPrueba, IngresosNumerados(120));
    await page.goto('/?pagina=2');
    await expect(page.getByText('Página 2 de 3')).toBeVisible();

    await AbrirEdicion(page, '+70,00');
    await expect(page).toHaveURL(/\/editar\?pagina=2$/);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Página 2 de 3')).toBeVisible();

    await AbrirEdicion(page, '+70,00');
    await page.getByLabel('Monto').fill('700');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('Página 1 de 3')).toBeVisible();
  });

  test('si el movimiento se elimina mientras el formulario está abierto, al guardar avisa y la lista se actualiza (FR-024)', async ({ page, usuarioPrueba }) => {
    const id = await PrepararGastoDe3000(usuarioPrueba);
    await page.goto('/');
    await AbrirEdicion(page, '-3.000,00');
    await EliminarMovimientoPorApi(usuarioPrueba, id);
    await page.getByLabel('Monto').fill('2000');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('El movimiento ya no existe. La lista se actualizará.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Error' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(FilaConMonto(page, '-3.000,00')).toHaveCount(0);
    await expect(FilaConMonto(page, '-2.000,00')).toHaveCount(0);
  });

  test('abrir la edición de un movimiento inexistente avisa y vuelve a la sección Cuenta (FR-024)', async ({ page }) => {
    await page.goto('/movimientos/00000000-0000-4000-8000-000000000000/editar');
    await expect(page.getByText('El movimiento ya no existe. La lista se actualizará.')).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
