import {
  COLOR_ROJO,
  COLOR_VERDE,
  EstablecerSaldo,
  FormatearFechaTexto,
  ObtenerFechaLocal,
  expect,
  test,
} from './ayudantes.js';

// Primera fila del grupo de una fecha.
function FilaDelGrupo(page, fechaTexto) {
  return page.getByRole('region', { name: fechaTexto }).locator('.fila-movimiento').first();
}

async function RegistrarDesdeCuenta(page, boton, monto) {
  await page.getByRole('button', { name: boton }).click();
  await page.getByLabel('Monto').fill(monto);
  await page.getByRole('button', { name: 'Guardar' }).click();
}

test.describe('registrar movimientos (US1)', () => {
  test('un usuario nuevo ve "Mi Cuenta (USD)", "USD 0,00" y el mensaje de lista vacía (AC-09, AC-42, AC-UI-13)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
    await expect(page.getByText('USD 0,00')).toBeVisible();
    await expect(page.getByText('Aquí verá sus movimientos.')).toBeVisible();
  });

  test('alta de un gasto en 3 interacciones con la categoría y la fecha por defecto (SC-002)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '0.00');
    await page.goto('/');
    await expect(page.getByText('USD 0,00')).toBeVisible();

    await page.getByRole('button', { name: 'Añadir Gasto' }).click(); // 1
    await page.getByLabel('Monto').fill('100'); // 2
    await page.getByRole('button', { name: 'Guardar' }).click(); // 3

    await expect(page.getByText('Gasto registrado con éxito.')).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('USD -100,00')).toBeVisible();
  });

  test('gasto de 1500: lista en rojo, saldo de 10.000 a 8.500 y mensaje con tic verde visible hasta "Aceptar" (AC-43, AC-111, AC-113, AC-UI-05, AC-UI-15)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '10000.00');
    await page.goto('/');
    await expect(page.getByText('USD 10.000,00')).toBeVisible();

    await RegistrarDesdeCuenta(page, 'Añadir Gasto', '1500');

    const mensaje = page.getByText('Gasto registrado con éxito.');
    await expect(mensaje).toBeVisible();
    await expect(page.getByRole('img', { name: 'Éxito' })).toBeVisible();
    // El formulario ya se cerró y la lista y el saldo se actualizaron antes del mensaje.
    await expect(page.getByText('USD 8.500,00')).toBeVisible();

    await page.waitForTimeout(10500);
    await expect(mensaje).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(mensaje).toBeHidden();

    const fila = FilaDelGrupo(page, FormatearFechaTexto(ObtenerFechaLocal(0)));
    await expect(fila.locator('.categoria')).toHaveText('Pago Realizado');
    await expect(fila.locator('.monto')).toHaveText('-1.500,00');
    await expect(fila.locator('.monto')).toHaveCSS('color', COLOR_ROJO);
    await expect(page.locator('.saldo')).toHaveCSS('color', COLOR_VERDE);
  });

  test('ingreso de 1000: "+1.000,00" en verde y saldo de 10.000 a 11.000 (AC-44)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '10000.00');
    await page.goto('/');
    await RegistrarDesdeCuenta(page, 'Añadir Ingreso', '1000');
    await expect(page.getByText('Ingreso registrado con éxito.')).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByText('USD 11.000,00')).toBeVisible();
    const fila = FilaDelGrupo(page, FormatearFechaTexto(ObtenerFechaLocal(0)));
    await expect(fila.locator('.categoria')).toHaveText('Pago Ingresado');
    await expect(fila.locator('.monto')).toHaveText('+1.000,00');
    await expect(fila.locator('.monto')).toHaveCSS('color', COLOR_VERDE);
  });

  test('"1500,50" se muestra "1.500,50" y deja el saldo en 8.499,50 (AC-52)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '10000.00');
    await page.goto('/');
    await page.getByRole('button', { name: 'Añadir Gasto' }).click();
    await page.getByLabel('Monto').pressSequentially('1500,50');
    await expect(page.getByLabel('Monto')).toHaveValue('1.500,50');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByText('USD 8.499,50')).toBeVisible();
    const fila = FilaDelGrupo(page, FormatearFechaTexto(ObtenerFechaLocal(0)));
    await expect(fila.locator('.monto')).toHaveText('-1.500,50');
  });

  test('un gasto mayor que el saldo deja "USD -1.000,00" en rojo (AC-59, AC-UI-02)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '1000.00');
    await page.goto('/');
    await RegistrarDesdeCuenta(page, 'Añadir Gasto', '2000');
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByText('USD -1.000,00')).toBeVisible();
    await expect(page.locator('.saldo')).toHaveCSS('color', COLOR_ROJO);
  });

  test('el saldo 0 se muestra en el color normal del texto (AC-UI-02)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '0.00');
    await page.goto('/');
    await expect(page.getByText('USD 0,00')).toBeVisible();
    await expect(page.locator('.saldo')).toHaveCSS('color', 'rgb(26, 26, 26)');
  });

  test('un monto 0 muestra el error con cruz roja y no registra nada (AC-45, AC-UI-15)', async ({ page, usuarioPrueba }) => {
    await EstablecerSaldo(usuarioPrueba, '10000.00');
    await page.goto('/');
    await RegistrarDesdeCuenta(page, 'Añadir Gasto', '0');
    await expect(page.getByText('El monto debe ser mayor a 0.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Error' })).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('USD 10.000,00')).toBeVisible();
  });
});
