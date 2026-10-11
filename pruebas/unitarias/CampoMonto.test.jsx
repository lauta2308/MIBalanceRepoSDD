import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import CampoMonto from '../../src/componentes/CampoMonto.jsx';

function CampoControlado() {
  const [monto, EstablecerMonto] = useState('');
  return <CampoMonto valor={monto} alCambiar={EstablecerMonto} />;
}

async function Escribir(texto) {
  const usuario = userEvent.setup();
  render(<CampoControlado />);
  const campo = screen.getByLabelText('Monto');
  await usuario.type(campo, texto);
  return campo;
}

// AC-50, AC-51, AC-UI-03, FR-009
describe('CampoMonto', () => {
  it.each([
    ['1500000', '1.500.000'],
    ['1500,50', '1.500,50'],
    ['10,555', '10,55'],
    ['-50', '50'],
    ['abc50', '50'],
    ['007', '7'],
    [',5', '0,5'],
  ])('al escribir %s muestra %s', async (texto, esperado) => {
    const campo = await Escribir(texto);
    expect(campo).toHaveValue(esperado);
  });

  it('al pegar "$1.500,50" muestra "1.500,50"', async () => {
    const usuario = userEvent.setup();
    render(<CampoControlado />);
    const campo = screen.getByLabelText('Monto');
    await usuario.click(campo);
    await usuario.paste('$1.500,50');
    expect(campo).toHaveValue('1.500,50');
  });

  it('usa el teclado decimal en celulares', () => {
    render(<CampoControlado />);
    expect(screen.getByLabelText('Monto')).toHaveAttribute('inputmode', 'decimal');
  });
});
