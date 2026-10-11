import { describe, expect, it } from 'vitest';
import { FiltrarCategoriasPorTipo, OrdenarCategorias } from '../../src/utilidades/categorias.js';

const categorias = [
  { id: '1', nombre: 'Transporte', tipo: 'GASTO', es_por_defecto: false },
  { id: '2', nombre: 'café', tipo: 'GASTO', es_por_defecto: false },
  { id: '3', nombre: 'Pago Realizado', tipo: 'GASTO', es_por_defecto: true },
  { id: '4', nombre: 'Mercado', tipo: 'GASTO', es_por_defecto: false },
  { id: '5', nombre: 'Pago Ingresado', tipo: 'INGRESO', es_por_defecto: true },
  { id: '6', nombre: 'Sueldo', tipo: 'INGRESO', es_por_defecto: false },
];

const Nombres = (lista) => lista.map((categoria) => categoria.nombre);

describe('OrdenarCategorias', () => {
  it('pone la por defecto primero y el resto sin distinguir mayúsculas (AC-58)', () => {
    const gastos = FiltrarCategoriasPorTipo(categorias, 'GASTO');
    expect(Nombres(OrdenarCategorias(gastos))).toEqual(['Pago Realizado', 'café', 'Mercado', 'Transporte']);
  });

  it('ordena "Ómnibus" como "Omnibus"', () => {
    const lista = ['Peaje', 'Ómnibus', 'Nafta', 'Mercado'].map((nombre, indice) => ({
      id: String(indice),
      nombre,
      tipo: 'GASTO',
      es_por_defecto: false,
    }));
    expect(Nombres(OrdenarCategorias(lista))).toEqual(['Mercado', 'Nafta', 'Ómnibus', 'Peaje']);
  });

  it('no modifica la lista original', () => {
    const copia = [...categorias];
    OrdenarCategorias(categorias);
    expect(categorias).toEqual(copia);
  });
});

describe('FiltrarCategoriasPorTipo', () => {
  it('devuelve solo las categorías del tipo', () => {
    expect(Nombres(FiltrarCategoriasPorTipo(categorias, 'INGRESO'))).toEqual(['Pago Ingresado', 'Sueldo']);
  });
});
