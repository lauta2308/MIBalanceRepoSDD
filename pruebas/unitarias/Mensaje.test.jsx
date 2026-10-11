import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProveedorMensajes, useMensajes } from '../../src/componentes/Mensaje.jsx';

function Disparador({ tipo, texto, alAceptar }) {
  const { MostrarMensaje } = useMensajes();
  return (
    <button type="button" onClick={() => MostrarMensaje({ tipo, texto }).then(alAceptar)}>
      Mostrar
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Mensaje', () => {
  it('muestra el éxito con tic verde (aria-label "Éxito") y "Aceptar"', async () => {
    const usuario = userEvent.setup();
    render(
      <ProveedorMensajes>
        <Disparador tipo="exito" texto="Gasto registrado con éxito." />
      </ProveedorMensajes>,
    );
    await usuario.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(screen.getByText('Gasto registrado con éxito.')).toBeInTheDocument();
    const icono = screen.getByRole('img', { name: 'Éxito' });
    expect(icono).toHaveClass('icono-exito');
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
  });

  it('muestra el error con cruz roja (aria-label "Error")', async () => {
    const usuario = userEvent.setup();
    render(
      <ProveedorMensajes>
        <Disparador tipo="error" texto="El monto debe ser mayor a 0." />
      </ProveedorMensajes>,
    );
    await usuario.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(screen.getByRole('img', { name: 'Error' })).toHaveClass('icono-error');
    expect(screen.getByText('El monto debe ser mayor a 0.')).toBeInTheDocument();
  });

  it('sigue visible pasados 10 segundos y se cierra solo con "Aceptar" (AC-113)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const alAceptar = vi.fn();
    render(
      <ProveedorMensajes>
        <Disparador tipo="exito" texto="Ingreso registrado con éxito." alAceptar={alAceptar} />
      </ProveedorMensajes>,
    );
    await usuario.click(screen.getByRole('button', { name: 'Mostrar' }));
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText('Ingreso registrado con éxito.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(screen.queryByText('Ingreso registrado con éxito.')).not.toBeInTheDocument();
    expect(alAceptar).toHaveBeenCalledTimes(1);
  });
});
