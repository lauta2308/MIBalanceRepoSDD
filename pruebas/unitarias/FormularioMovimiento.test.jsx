import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormularioMovimiento from '../../src/componentes/FormularioMovimiento.jsx';
import { ProveedorMensajes } from '../../src/componentes/Mensaje.jsx';

const categorias = [
  { id: 'g0', nombre: 'Pago Realizado', tipo: 'GASTO', es_por_defecto: true },
  { id: 'g1', nombre: 'Transporte', tipo: 'GASTO', es_por_defecto: false },
  { id: 'g2', nombre: 'café', tipo: 'GASTO', es_por_defecto: false },
  { id: 'g3', nombre: 'Mercado', tipo: 'GASTO', es_por_defecto: false },
  { id: 'i0', nombre: 'Pago Ingresado', tipo: 'INGRESO', es_por_defecto: true },
  { id: 'i1', nombre: 'Sueldo', tipo: 'INGRESO', es_por_defecto: false },
];

function Promesa() {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

function RenderizarAlta({ tipo = 'GASTO', alGuardar = vi.fn(), alCancelar = vi.fn() } = {}) {
  render(
    <ProveedorMensajes>
      <FormularioMovimiento modo="alta" tipoInicial={tipo} categorias={categorias} alGuardar={alGuardar} alCancelar={alCancelar} />
    </ProveedorMensajes>,
  );
  return { alGuardar, alCancelar };
}

const OpcionesCategoria = () =>
  within(screen.getByLabelText('Categoría'))
    .getAllByRole('option')
    .map((opcion) => opcion.textContent);

afterEach(() => {
  vi.useRealTimers();
});

describe('FormularioMovimiento en modo alta', () => {
  it('abre con monto vacío, categoría por defecto y fecha de hoy (AC-55, FR-006)', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
    RenderizarAlta();
    expect(screen.getByRole('heading', { name: 'Añadir Gasto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toHaveValue('');
    expect(screen.getByLabelText('Categoría')).toHaveDisplayValue('Pago Realizado');
    expect(screen.getByText('03/10/2026')).toBeInTheDocument();
  });

  it('en "Añadir Ingreso" preselecciona "Pago Ingresado"', () => {
    RenderizarAlta({ tipo: 'INGRESO' });
    expect(screen.getByRole('heading', { name: 'Añadir Ingreso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Categoría')).toHaveDisplayValue('Pago Ingresado');
  });

  it('el selector muestra solo categorías del tipo, ordenadas y sin opción vacía (AC-54, AC-58)', () => {
    RenderizarAlta();
    expect(OpcionesCategoria()).toEqual(['Pago Realizado', 'café', 'Mercado', 'Transporte']);
  });

  it.each([[''], ['0'], ['0,00']])('con monto "%s" muestra "El monto debe ser mayor a 0." y no guarda (AC-45)', async (monto) => {
    const usuario = userEvent.setup();
    const { alGuardar } = RenderizarAlta();
    if (monto) await usuario.type(screen.getByLabelText('Monto'), monto);
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('El monto debe ser mayor a 0.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Error' })).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it('con 1.000.000.000.000,00 muestra "El monto máximo es 999.999.999.999,99." (AC-46)', async () => {
    const usuario = userEvent.setup();
    const { alGuardar } = RenderizarAlta({ tipo: 'INGRESO' });
    await usuario.type(screen.getByLabelText('Monto'), '1000000000000,00');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('El monto máximo es 999.999.999.999,99.')).toBeInTheDocument();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it('envía tipo, monto como texto de la API, categoría y fecha', async () => {
    const usuario = userEvent.setup();
    const { alGuardar } = RenderizarAlta();
    await usuario.type(screen.getByLabelText('Monto'), '1500,5');
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Mercado');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(alGuardar.mock.calls[0][0]).toMatchObject({ tipo: 'GASTO', monto: '1500.50', idCategoria: 'g3' });
    expect(alGuardar.mock.calls[0][0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('mientras guarda: "Guardando…" deshabilitado, "Cancelar" y flecha deshabilitados, sin doble envío (FR-032)', async () => {
    const usuario = userEvent.setup();
    const pendiente = Promesa();
    const alGuardar = vi.fn(() => pendiente.promesa);
    RenderizarAlta({ alGuardar });
    await usuario.type(screen.getByLabelText('Monto'), '100');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    const botonGuardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(botonGuardando).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
    expect(screen.getByLabelText('Monto')).toBeDisabled();

    await usuario.click(botonGuardando);
    expect(alGuardar).toHaveBeenCalledTimes(1);
    pendiente.resolver({ ok: true });
  });

  it('si falla, el formulario sigue abierto con los valores y muestra el error (FR-020, FR-024)', async () => {
    const usuario = userEvent.setup();
    const alGuardar = vi.fn(async () => ({ ok: false, texto: 'No se pudo registrar el gasto. Vuelva a intentarlo.' }));
    RenderizarAlta({ alGuardar });
    await usuario.type(screen.getByLabelText('Monto'), '1500,50');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('No se pudo registrar el gasto. Vuelva a intentarlo.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(screen.getByLabelText('Monto')).toHaveValue('1.500,50');
    expect(screen.getByLabelText('Monto')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('"Cancelar" y la flecha llaman a alCancelar sin guardar', async () => {
    const usuario = userEvent.setup();
    const { alGuardar, alCancelar } = RenderizarAlta();
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Volver' }));
    expect(alCancelar).toHaveBeenCalledTimes(2);
    expect(alGuardar).not.toHaveBeenCalled();
  });
});

describe('FormularioMovimiento en modo edición', () => {
  const categoriasEdicion = [
    { id: 'g0', nombre: 'Pago Realizado', tipo: 'GASTO', es_por_defecto: true },
    { id: 'g1', nombre: 'Transporte', tipo: 'GASTO', es_por_defecto: false },
    { id: 'g3', nombre: 'Mercado', tipo: 'GASTO', es_por_defecto: false },
    { id: 'i0', nombre: 'Pago Ingresado', tipo: 'INGRESO', es_por_defecto: true },
    { id: 'i1', nombre: 'Sueldo', tipo: 'INGRESO', es_por_defecto: false },
  ];
  const movimiento = { id: 'm1', tipo: 'GASTO', monto: '1500.00', id_categoria: 'g1', fecha: '2026-09-17' };

  function RenderizarEdicion(alGuardar = vi.fn(async () => ({ ok: true }))) {
    render(
      <ProveedorMensajes>
        <FormularioMovimiento
          modo="edicion"
          movimiento={movimiento}
          categorias={categoriasEdicion}
          alGuardar={alGuardar}
          alCancelar={vi.fn()}
        />
      </ProveedorMensajes>,
    );
    return alGuardar;
  }

  it('muestra los valores guardados: monto sin signo, categoría, fecha y tipo (AC-60, AC-61, AC-UI-06)', () => {
    RenderizarEdicion();
    expect(screen.getByRole('heading', { name: 'Editar Movimiento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toHaveValue('1.500,00');
    expect(screen.getByLabelText('Categoría')).toHaveDisplayValue('Transporte');
    expect(screen.getByLabelText('Tipo')).toHaveDisplayValue('Gasto');
    expect(screen.getByText('17/09/2026')).toBeInTheDocument();
  });

  it('no ofrece "Eliminar" (AC-70)', () => {
    RenderizarEdicion();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('cambiar de "Transporte" a "Mercado" envía la nueva categoría (AC-62)', async () => {
    const usuario = userEvent.setup();
    const alGuardar = RenderizarEdicion();
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Mercado');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(alGuardar.mock.calls[0][0]).toEqual({ tipo: 'GASTO', monto: '1500.00', idCategoria: 'g3', fecha: '2026-09-17' });
  });

  it('al cambiar a "Ingreso" pasa a "Pago Ingresado" y muestra solo categorías de ingreso (AC-64)', async () => {
    const usuario = userEvent.setup();
    RenderizarEdicion();
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Ingreso');
    expect(screen.getByLabelText('Categoría')).toHaveDisplayValue('Pago Ingresado');
    expect(OpcionesCategoria()).toEqual(['Pago Ingresado', 'Sueldo']);
    expect(screen.getByLabelText('Monto')).toHaveValue('1.500,00');
  });

  it('cambiar a "Ingreso" y elegir "Sueldo" envía tipo y categoría (AC-65)', async () => {
    const usuario = userEvent.setup();
    const alGuardar = RenderizarEdicion();
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Ingreso');
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Sueldo');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(alGuardar.mock.calls[0][0]).toMatchObject({ tipo: 'INGRESO', idCategoria: 'i1', monto: '1500.00' });
  });
});
