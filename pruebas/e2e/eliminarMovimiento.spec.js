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

// Saldo de 5.000 que incluye un ingreso de 1.000 de hoy; devuelve su id.
async function PrepararIngresoDe1000(usuarioPrueba) {
  await EstablecerSaldo(usuarioPrueba, '4000.00');
  const [id] = await CargarMovimientos(usuarioPrueba, [{ tipo: 'INGRESO', monto: '1000.00' }]);
  return id;
}

async function PedirEliminar(page, monto) {
  await FilaConMonto(page, monto).click();
  await page.getByRole('button', { name: 'Eliminar' }).click();
}

test.describe('eliminar un movimiento (US4)', () => {
  test.describe.configure({ timeout: 180000 });

  test('pide confirmación y "Cancelar" no cambia nada (AC-71)', async ({ page, usuarioPrueba }) => {
    await PrepararIngresoDe1000(usuarioPrueba);
    await page.goto('/');
    await PedirEliminar(page, '+1.000,00');
    await expect(page.getByText('¿Está seguro que desea eliminar este movimiento?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByText('¿Está seguro que desea eliminar este movimiento?')).toBeHidden();
    await expect(FilaConMonto(page, '+1.000,00')).toHaveCount(1);
    await expect(page.getByText('USD 5.000,00')).toBeVisible();
  });

  test('al confirmar, "Eliminando…" deshabilitado, el movimiento desaparece y el saldo queda en 4.000 (AC-68, FR-032)', async ({ page, usuarioPrueba }) => {
    await PrepararIngresoDe1000(usuarioPrueba);
    await page.route('**/rest/v1/rpc/basp_eliminar_movimiento', async (ruta) => {
      await new Promise((resolver) => setTimeout(resolver, 1500));
      await ruta.continue();
    });
    await page.goto('/');
    await PedirEliminar(page, '+1.000,00');
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await expect(page.getByText('Movimiento eliminado con éxito.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Éxito' })).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(FilaConMonto(page, '+1.000,00')).toHaveCount(0);
    await expect(page.getByText('USD 4.000,00')).toBeVisible();
  });

  test('desde la página 2, eliminar vuelve a la página 1 (AC-40 eliminación)', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(
      usuarioPrueba,
      Array.from({ length: 120 }, (_, indice) => ({ tipo: 'INGRESO', monto: `${indice + 1}.00`, fecha: ObtenerFechaLocal(0) })),
    );
    await page.goto('/?pagina=2');
    await expect(page.getByText('Página 2 de 3')).toBeVisible();
    await PedirEliminar(page, '+70,00');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    await expect(page).not.toHaveURL(/pagina=2/);
  });

  test('si el movimiento ya se eliminó, al confirmar avisa y la lista se actualiza (FR-024)', async ({ page, usuarioPrueba }) => {
    const id = await PrepararIngresoDe1000(usuarioPrueba);
    await page.goto('/');
    await FilaConMonto(page, '+1.000,00').click();
    await EliminarMovimientoPorApi(usuarioPrueba, id);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText('El movimiento ya no existe. La lista se actualizará.')).toBeVisible();
    await expect(page.getByText('¿Está seguro que desea eliminar este movimiento?')).toBeHidden();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(FilaConMonto(page, '+1.000,00')).toHaveCount(0);
    await expect(page.getByText('USD 4.000,00')).toBeVisible();
  });
});
