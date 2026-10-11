import { expect, test } from '@playwright/test';
import { InyectarSesion } from '../e2e/ayudantes.js';
import { CrearUsuarioConMovimientos } from './cargarDatos.js';

// SC-003, AC-115: con 5.000 movimientos, CPU 4× y red emulada (10 Mbps, 100 ms), el p95 de
// altas, ediciones y eliminaciones (desde la confirmación hasta ver lista y saldo actualizados)
// es menor a 2 segundos.
const REPETICIONES = 100;
const LIMITE_P95_MS = 2000;
const BYTES_POR_SEGUNDO = (10 * 1024 * 1024) / 8;

test.describe.configure({ mode: 'serial' });

let usuario;

test.beforeAll(async () => {
  test.setTimeout(20 * 60 * 1000);
  usuario = await CrearUsuarioConMovimientos(5000);
});

function CalcularP95(tiempos) {
  const ordenados = [...tiempos].sort((a, b) => a - b);
  return ordenados[Math.ceil(ordenados.length * 0.95) - 1];
}

async function PrepararPagina(page) {
  await InyectarSesion(page, usuario.sesion);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: BYTES_POR_SEGUNDO,
    uploadThroughput: BYTES_POR_SEGUNDO,
  });
  await page.goto('/');
  await expect(page.locator('.saldo')).toBeVisible({ timeout: 30000 });
}

// Mide desde el clic de confirmación hasta el mensaje de éxito, que se muestra después de
// actualizar la lista y el saldo (FR-022).
async function Medir(page, botonConfirmar, textoExito) {
  const inicio = Date.now();
  await page.getByRole('button', { name: botonConfirmar }).click();
  await expect(page.getByText(textoExito)).toBeVisible({ timeout: 30000 });
  const duracion = Date.now() - inicio;
  await page.getByRole('button', { name: 'Aceptar' }).click();
  return duracion;
}

function Informar(nombre, tiempos) {
  const p95 = CalcularP95(tiempos);
  const ordenados = [...tiempos].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  test.info().annotations.push({ type: nombre, description: `p95 ${p95} ms (n=${tiempos.length})` });
  console.log(`${nombre}: p95 ${p95} ms, máximo ${Math.max(...tiempos)} ms, mediana ${mediana} ms`);
  return p95;
}

test('altas', async ({ page }) => {
  test.setTimeout(30 * 60 * 1000);
  await PrepararPagina(page);
  const tiempos = [];
  for (let indice = 0; indice < REPETICIONES; indice += 1) {
    await page.getByRole('button', { name: 'Añadir Gasto' }).click();
    await page.getByLabel('Monto').fill(String(indice + 1));
    tiempos.push(await Medir(page, 'Guardar', 'Gasto registrado con éxito.'));
  }
  expect(Informar('altas', tiempos)).toBeLessThan(LIMITE_P95_MS);
});

test('ediciones', async ({ page }) => {
  test.setTimeout(30 * 60 * 1000);
  await PrepararPagina(page);
  const tiempos = [];
  for (let indice = 0; indice < REPETICIONES; indice += 1) {
    await page.locator('.fila-movimiento').first().click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Monto').fill(String(indice + 500));
    tiempos.push(await Medir(page, 'Guardar', 'Movimiento actualizado con éxito.'));
  }
  expect(Informar('ediciones', tiempos)).toBeLessThan(LIMITE_P95_MS);
});

test('eliminaciones', async ({ page }) => {
  test.setTimeout(30 * 60 * 1000);
  await PrepararPagina(page);
  const tiempos = [];
  for (let indice = 0; indice < REPETICIONES; indice += 1) {
    await page.locator('.fila-movimiento').first().click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    tiempos.push(await Medir(page, 'Confirmar', 'Movimiento eliminado con éxito.'));
  }
  expect(Informar('eliminaciones', tiempos)).toBeLessThan(LIMITE_P95_MS);
});
