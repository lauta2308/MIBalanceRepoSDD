import { CargarMovimientos, EstablecerSaldo, expect, test } from './ayudantes.js';

// SC-009, FR-036: todo solo con el teclado y con el foco visible en cada paso.

async function EsperarFocoVisible(page) {
  const estilo = await page.evaluate(() => {
    const elemento = document.activeElement;
    if (!elemento || elemento === document.body) return null;
    const calculado = getComputedStyle(elemento);
    return { contorno: calculado.outlineStyle, ancho: calculado.outlineWidth };
  });
  expect(estilo, 'hay un elemento con foco').not.toBeNull();
  expect(estilo.contorno).not.toBe('none');
  expect(parseFloat(estilo.ancho)).toBeGreaterThanOrEqual(2);
}

// Avanza con Tab (o Shift+Tab) hasta el elemento que cumple la condición, comprobando el foco
// visible en cada paso.
async function TabularHasta(page, descripcion, condicion, { atras = false, maximo = 40 } = {}) {
  for (let paso = 0; paso < maximo; paso += 1) {
    await page.keyboard.press(atras ? 'Shift+Tab' : 'Tab');
    // Con la página recién cargada, el primer Tab solo hace entrar el foco a la página.
    if (paso === 0 && (await page.evaluate(() => document.activeElement === document.body))) continue;
    await EsperarFocoVisible(page);
    if (await page.evaluate(condicion)) return;
  }
  throw new Error(`No se llegó con el teclado a: ${descripcion}`);
}

const EsBoton = (texto) => new Function(`return document.activeElement?.textContent?.trim() === ${JSON.stringify(texto)};`);
const EsCampo = (id) => new Function(`return document.activeElement?.id === ${JSON.stringify(id)};`);
const EsFila = (monto) =>
  new Function(
    `const e = document.activeElement; return e?.classList.contains('fila-movimiento') && e.textContent.includes(${JSON.stringify(monto)});`,
  );

test.describe('teclado (SC-009)', () => {
  test.describe.configure({ timeout: 180000 });

  test('alta con el calendario, edición y eliminación solo con teclado', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '0.00');
    await page.goto('/');
    await expect(page.getByText('USD 0,00')).toBeVisible();

    // Alta
    await TabularHasta(page, 'Añadir Gasto', EsBoton('Añadir Gasto'));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Añadir Gasto' })).toBeVisible();
    await TabularHasta(page, 'Monto', EsCampo('campo-monto'));
    await page.keyboard.type('1500');
    await TabularHasta(page, 'Fecha', EsCampo('boton-fecha'));
    await page.keyboard.press('Enter');
    await expect(page.locator('.calendario')).toBeVisible();
    await EsperarFocoVisible(page);
    await page.keyboard.press('ArrowLeft');
    await EsperarFocoVisible(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.calendario')).toHaveCount(0);
    await EsperarFocoVisible(page);
    await TabularHasta(page, 'Guardar', EsBoton('Guardar'));
    await page.keyboard.press('Enter');
    await expect(page.getByText('Gasto registrado con éxito.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Éxito' })).toBeVisible();
    await EsperarFocoVisible(page);
    await page.keyboard.press('Enter');
    await expect(page.getByText('USD -1.500,00')).toBeVisible();

    // Edición
    await TabularHasta(page, 'fila del gasto', EsFila('-1.500,00'));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Editar' })).toBeFocused();
    await EsperarFocoVisible(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Editar' })).toBeHidden();
    await EsperarFocoVisible(page);
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Editar' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
    await TabularHasta(page, 'Monto', EsCampo('campo-monto'));
    await page.keyboard.press('Control+A');
    await page.keyboard.type('2000');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Movimiento actualizado con éxito.')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByText('USD -2.000,00')).toBeVisible();

    // Eliminación
    await TabularHasta(page, 'fila del gasto', EsFila('-2.000,00'));
    await page.keyboard.press('Enter');
    await TabularHasta(page, 'Eliminar', EsBoton('Eliminar'));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await TabularHasta(page, 'Confirmar', EsBoton('Confirmar'), { atras: true });
    await page.keyboard.press('Enter');
    await expect(page.getByText('Movimiento eliminado con éxito.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Éxito' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByText('USD 0,00')).toBeVisible();
  });

  test('paginación y mensaje de error solo con teclado', async ({ page, usuarioPrueba }) => {
    await CargarMovimientos(
      usuarioPrueba,
      Array.from({ length: 51 }, () => ({ tipo: 'INGRESO', monto: '1.00', fecha: '2026-01-10' })),
    );
    await page.goto('/');
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await TabularHasta(page, 'Siguiente', EsBoton('Siguiente'), { maximo: 70 });
    await page.keyboard.press('Enter');
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    // "Siguiente" queda deshabilitado en la última página: el foco pasa a "Anterior".
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeFocused();
    await EsperarFocoVisible(page);
    await page.keyboard.press('Enter');
    await expect(page.getByText('Página 1 de 2')).toBeVisible();

    await page.goto('/movimientos/nuevo/gasto');
    await expect(page.getByLabel('Monto')).toBeVisible();
    await TabularHasta(page, 'Guardar', EsBoton('Guardar'));
    await page.keyboard.press('Enter');
    await expect(page.getByText('El monto debe ser mayor a 0.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Error' })).toBeVisible();
    await EsperarFocoVisible(page);
    await page.keyboard.press('Enter');
    await expect(page.getByText('El monto debe ser mayor a 0.')).toBeHidden();
    await TabularHasta(page, 'Cancelar', EsBoton('Cancelar'));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
  });
});
