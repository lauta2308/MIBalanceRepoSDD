import {
  ContarMovimientosPorApi,
  FormatearFechaTexto,
  ObtenerFechaLocal,
  ObtenerSaldoPorApi,
  SimularCategorias,
  expect,
  test,
} from './ayudantes.js';

test.describe('formulario de alta (US1)', () => {
  test('el selector muestra solo categorías de gasto en el orden de AC-58 (AC-54)', async ({ page }) => {
    await SimularCategorias(page, [
      { nombre: 'Transporte', tipo: 'GASTO' },
      { nombre: 'café', tipo: 'GASTO' },
      { nombre: 'Mercado', tipo: 'GASTO' },
      { nombre: 'Sueldo', tipo: 'INGRESO' },
    ]);
    await page.goto('/movimientos/nuevo/gasto');
    const opciones = page.getByLabel('Categoría').locator('option');
    await expect(opciones).toHaveText(['Pago Realizado', 'café', 'Mercado', 'Transporte']);
  });

  test('calendario en español, desde el lunes, con hoy seleccionado y días futuros deshabilitados (AC-53, AC-56)', async ({ page }) => {
    const hoy = ObtenerFechaLocal(0);
    const manana = ObtenerFechaLocal(1);
    await page.goto('/movimientos/nuevo/gasto');
    const botonFecha = page.getByRole('button', { name: /Fecha/ });
    await expect(botonFecha).toContainText(FormatearFechaTexto(hoy));
    await botonFecha.click();

    const calendario = page.locator('.calendario');
    await expect(calendario.locator('.rdp-weekday').first()).toHaveAttribute('aria-label', 'lunes');
    await expect(calendario.locator(`[data-day="${hoy}"] button`)).toHaveAttribute('aria-label', /^Hoy, .*seleccionado$/);
    if (manana.slice(0, 7) === hoy.slice(0, 7)) {
      await expect(calendario.locator(`[data-day="${manana}"] button`)).toBeDisabled();
    } else {
      await expect(calendario.getByRole('button', { name: 'Ir al mes siguiente' })).toBeDisabled();
    }
    // No hay hora: solo días.
    await expect(page.locator('input[type="time"], input[type="datetime-local"]')).toHaveCount(0);
  });

  test('elegir otra fecha la muestra en DD/MM/AAAA', async ({ page }) => {
    await page.goto('/movimientos/nuevo/gasto');
    await page.getByRole('button', { name: /Fecha/ }).click();
    await page.getByRole('button', { name: 'Ir al mes anterior' }).click();
    const primerDia = page.locator('.calendario .rdp-day:not(.rdp-outside) button').first();
    await primerDia.click();
    const fechaMesAnterior = new Date();
    fechaMesAnterior.setDate(1);
    fechaMesAnterior.setMonth(fechaMesAnterior.getMonth() - 1);
    const mes = String(fechaMesAnterior.getMonth() + 1).padStart(2, '0');
    await expect(page.getByRole('button', { name: /Fecha/ })).toContainText(`01/${mes}/${fechaMesAnterior.getFullYear()}`);
  });

  for (const formaDeCancelar of ['Cancelar', 'Volver']) {
    test(`"${formaDeCancelar}" no registra nada y el formulario vuelve a sus valores por defecto (AC-05, AC-57, AC-67)`, async ({ page, usuarioPrueba }) => {
      await SimularCategorias(page, [{ nombre: 'Sueldo', tipo: 'INGRESO' }]);
      const saldoAntes = await ObtenerSaldoPorApi(usuarioPrueba);
      const cantidadAntes = await ContarMovimientosPorApi(usuarioPrueba);

      await page.goto('/');
      await page.getByRole('button', { name: 'Añadir Ingreso' }).click();
      await page.getByLabel('Monto').fill('500');
      await page.getByLabel('Categoría').selectOption('Sueldo');
      await page.getByRole('button', { name: /Fecha/ }).click();
      await page.getByRole('button', { name: 'Ir al mes anterior' }).click();
      await page.locator('.calendario .rdp-day:not(.rdp-outside) button').first().click();
      await page.getByRole('button', { name: formaDeCancelar }).click();

      await expect(page.getByRole('heading', { name: 'Mi Cuenta (USD)' })).toBeVisible();
      expect(await ObtenerSaldoPorApi(usuarioPrueba)).toBe(saldoAntes);
      expect(await ContarMovimientosPorApi(usuarioPrueba)).toBe(cantidadAntes);

      await page.getByRole('button', { name: 'Añadir Ingreso' }).click();
      await expect(page.getByLabel('Monto')).toHaveValue('');
      await expect(page.getByLabel('Categoría')).toHaveValue(/.+/);
      await expect(page.getByLabel('Categoría').locator('option:checked')).toHaveText('Pago Ingresado');
      await expect(page.getByRole('button', { name: /Fecha/ })).toContainText(FormatearFechaTexto(ObtenerFechaLocal(0)));
    });
  }
});
