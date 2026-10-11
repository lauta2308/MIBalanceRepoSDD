import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Paginacion from '../../src/componentes/Paginacion.jsx';

// FR-014
describe('Paginacion', () => {
  it('no muestra nada con 50 movimientos o menos', () => {
    const { container } = render(<Paginacion paginaActual={1} totalMovimientos={50} alCambiarPagina={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('en la primera página muestra "Página 1 de 3" con "Anterior" deshabilitado', () => {
    render(<Paginacion paginaActual={1} totalMovimientos={120} alCambiarPagina={vi.fn()} />);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  it('en la última página muestra "Página 3 de 3" con "Siguiente" deshabilitado', () => {
    render(<Paginacion paginaActual={3} totalMovimientos={120} alCambiarPagina={vi.fn()} />);
    expect(screen.getByText('Página 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('con 51 movimientos hay 2 páginas', () => {
    render(<Paginacion paginaActual={1} totalMovimientos={51} alCambiarPagina={vi.fn()} />);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('avisa la página pedida', async () => {
    const usuario = userEvent.setup();
    const alCambiarPagina = vi.fn();
    render(<Paginacion paginaActual={2} totalMovimientos={120} alCambiarPagina={alCambiarPagina} />);
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));
    await usuario.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(alCambiarPagina.mock.calls).toEqual([[3], [1]]);
  });

  it('deshabilita los botones mientras carga', () => {
    render(<Paginacion paginaActual={2} totalMovimientos={120} cargando alCambiarPagina={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});
