import { describe, expect, it, vi } from 'vitest';
import { dayHistorySchema, HISTORY_MESSAGES } from '@kofi/contracts';
import { createFakeClock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { testSale } from '../../../test/test-sales.ts';
import { createHistoryService } from './history.service.ts';

function setup(instant = '2026-10-25T15:00:00.000Z') {
  const clock = createFakeClock(new Date(instant));
  const db = {} as Database;
  const listSales = vi.fn().mockResolvedValue([testSale()]);
  return { clock, db, listSales, service: createHistoryService({ clock, db, listSales }) };
}

describe('consulta de un día (RF-2, RF-3, RF-5, RF-7)', () => {
  it('asigna cada venta al día local correcto a ambos lados del salto de 1931 (T031)', async () => {
    const { service, listSales } = setup();
    const sales = [
      '1931-10-15T04:00:00Z',
      '1931-10-15T04:32:35.999Z',
      '1931-10-15T04:32:36Z',
      '1931-10-16T03:32:35.999Z',
      '1931-10-16T03:32:36Z',
    ].map((registeredAt, index) => testSale({ registeredAt, number: index + 1 }));
    listSales.mockImplementation(async (_db, { from, to }: { from: Date; to: Date }) =>
      sales.filter(
        (sale) => new Date(sale.registeredAt) >= from && new Date(sale.registeredAt) < to,
      ),
    );
    expect((await service.day('1931-10-14')).sales.map((sale) => sale.number)).toEqual([2, 1]);
    expect((await service.day('1931-10-15')).sales.map((sale) => sale.number)).toEqual([4, 3]);
    expect((await service.day('1931-10-16')).sales.map((sale) => sale.number)).toEqual([5]);
  });
  it('0099 solo lee su día y no incluye una venta registrada en 1950 (T030)', async () => {
    const { service, db, listSales } = setup();
    const sale = testSale({ registeredAt: '1950-01-01T12:00:00Z' });
    listSales.mockImplementation(async (_db, { from, to }: { from: Date; to: Date }) =>
      new Date(sale.registeredAt) >= from && new Date(sale.registeredAt) < to ? [sale] : [],
    );
    expect(dayHistorySchema.parse(await service.day('0099-12-31'))).toMatchObject({
      date: '0099-12-31',
      previousDate: '0099-12-30',
      nextDate: '0100-01-01',
      salesCount: 0,
      sales: [],
    });
    expect(listSales).toHaveBeenCalledWith(db, {
      from: new Date('0099-12-31T04:32:36Z'),
      to: new Date('0100-01-01T04:32:36Z'),
    });
  });
  it('el primer día representable no retrocede y el año cero se rechaza sin leer (T030)', async () => {
    const { service, listSales } = setup();
    listSales.mockResolvedValue([]);
    expect(dayHistorySchema.parse(await service.day('0001-01-01'))).toMatchObject({
      date: '0001-01-01',
      previousDate: null,
      nextDate: '0001-01-02',
    });
    listSales.mockClear();
    await expect(service.day('0000-12-31')).rejects.toMatchObject({
      statusCode: 400,
      message: HISTORY_MESSAGES.invalidDate,
    });
    expect(listSales).not.toHaveBeenCalled();
  });
  it('consulta hoy en Bolivia hasta now + 1 ms y devuelve navegación y momento', async () => {
    const { service, db, listSales } = setup();
    const result = dayHistorySchema.parse(await service.day());
    expect(result).toMatchObject({
      date: '2026-10-25',
      today: '2026-10-25',
      previousDate: '2026-10-24',
      nextDate: null,
      asOf: '2026-10-25T15:00:00.000Z',
      totalCents: 1250,
    });
    expect(listSales).toHaveBeenCalledExactlyOnceWith(db, {
      from: new Date('2026-10-25T04:00:00Z'),
      to: new Date('2026-10-25T15:00:00.001Z'),
    });
  });
  it('consulta un día pasado completo y conserva los datos históricos', async () => {
    const { service, db, listSales } = setup();
    const result = dayHistorySchema.parse(await service.day('2026-10-24'));
    expect(result).toMatchObject({
      date: '2026-10-24',
      previousDate: '2026-10-23',
      nextDate: '2026-10-25',
    });
    expect(result.sales[0]).toMatchObject({
      registeredBy: { userId: null, displayName: 'Cajero de prueba', role: 'cashier' },
    });
    expect(listSales).toHaveBeenCalledWith(db, {
      from: new Date('2026-10-24T04:00:00Z'),
      to: new Date('2026-10-25T04:00:00Z'),
    });
  });
  it.each([
    ['2026-02-30', HISTORY_MESSAGES.invalidDate],
    ['ayer', HISTORY_MESSAGES.invalidDate],
    ['', HISTORY_MESSAGES.invalidDate],
    ['2026-10-26', HISTORY_MESSAGES.futureDate],
  ])('rechaza %s sin leer ventas', async (date, message) => {
    const { service, listSales } = setup();
    await expect(service.day(date)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message,
    });
    expect(listSales).not.toHaveBeenCalled();
  });
  it('cambia hoy solo al volver a consultar tras medianoche de Bolivia', async () => {
    const { service, clock } = setup('2026-10-26T03:59:59.999Z');
    expect((await service.day()).date).toBe('2026-10-25');
    clock.advance(1);
    expect((await service.day()).date).toBe('2026-10-26');
    expect((await service.day('2026-10-25')).nextDate).toBe('2026-10-26');
  });
  it('permite fechas anteriores a la primera venta, con el desfase histórico de Bolivia', async () => {
    const { service, db, listSales } = setup();
    listSales.mockResolvedValue([]);
    expect(dayHistorySchema.parse(await service.day('1900-01-01'))).toMatchObject({
      date: '1900-01-01',
      previousDate: '1899-12-31',
      nextDate: '1900-01-02',
      salesCount: 0,
    });
    expect(listSales).toHaveBeenCalledWith(db, {
      from: new Date('1900-01-01T04:32:36Z'),
      to: new Date('1900-01-02T04:32:36Z'),
    });
  });
});
