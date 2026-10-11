import {
  CargarMovimientos,
  EsperarSinDesplazamientoHorizontal,
  EstablecerSaldo,
  SimularCategorias,
  expect,
  test,
} from './ayudantes.js';

// SC-007, FR-030: todas las acciones sin desplazamiento horizontal, con un saldo de 16 dígitos y
// una categoría de 30 caracteres.
const CATEGORIA_LARGA = 'Supermercado y Almacén del Mes';

for (const ancho of [320, 768, 1280, 1920]) {
  test(`a ${ancho}px se puede hacer alta, edición, eliminación y paginación sin desplazamiento horizontal`, async ({ page, usuarioPrueba }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: ancho, height: 800 });
    await SimularCategorias(page, [{ nombre: CATEGORIA_LARGA, tipo: 'GASTO' }]);
    await CargarMovimientos(
      usuarioPrueba,
      Array.from({ length: 51 }, () => ({ tipo: 'INGRESO', monto: '1.00', fecha: '2026-01-10' })),
    );
    await EstablecerSaldo(usuarioPrueba, '1999999999999.98');

    await page.goto('/');
    const saldo = page.locator('.saldo');
    await expect(saldo).toHaveText('USD 1.999.999.999.999,98');
    await EsperarSinDesplazamientoHorizontal(page);
    // El saldo se ve completo, dentro de la pantalla.
    const caja = await saldo.boundingBox();
    expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);

    // Paginación
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    await EsperarSinDesplazamientoHorizontal(page);
    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page.getByText('Página 1 de 2')).toBeVisible();

    // Alta, con la categoría larga y el calendario abierto
    await page.getByRole('button', { name: 'Añadir Gasto' }).click();
    await page.getByLabel('Categoría').selectOption(CATEGORIA_LARGA);
    await EsperarSinDesplazamientoHorizontal(page);
    await page.getByRole('button', { name: /Fecha/ }).click();
    await expect(page.locator('.calendario')).toBeVisible();
    await EsperarSinDesplazamientoHorizontal(page);
    const calendario = page.locator('.calendario');
    expect(await calendario.evaluate((elemento) => elemento.scrollWidth <= elemento.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await page.getByLabel('Categoría').selectOption('Pago Realizado');
    await page.getByLabel('Monto').fill('999999999999,99');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Gasto registrado con éxito.')).toBeVisible();
    await EsperarSinDesplazamientoHorizontal(page);
    await page.getByRole('button', { name: 'Aceptar' }).click();

    // Edición
    const primeraFila = page.locator('.fila-movimiento').first();
    await expect(primeraFila.locator('.monto')).toHaveText('-999.999.999.999,99');
    await EsperarSinDesplazamientoHorizontal(page);
    await primeraFila.click();
    await EsperarSinDesplazamientoHorizontal(page);
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
    await EsperarSinDesplazamientoHorizontal(page);
    await page.getByLabel('Monto').fill('5');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    // Eliminación
    await page.locator('.fila-movimiento').first().click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('¿Está seguro que desea eliminar este movimiento?')).toBeVisible();
    await EsperarSinDesplazamientoHorizontal(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Movimiento eliminado con éxito.')).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await EsperarSinDesplazamientoHorizontal(page);
  });
}
