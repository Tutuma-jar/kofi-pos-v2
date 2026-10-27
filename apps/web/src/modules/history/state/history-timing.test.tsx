import { render, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryTimingObserver } from '../components/HistoryTimingObserver.tsx';
import { useHistoryTiming } from './useHistoryTiming.ts';
function Probe({
  readyKey = '/ventas/mes?mes=2026-10',
  loading = false,
}: {
  readyKey?: string;
  loading?: boolean;
}) {
  const ref = useHistoryTiming(readyKey, loading);
  return (
    <>
      <HistoryTimingObserver />
      <main ref={ref}>
        <a href="/ventas?fecha=2026-09-15" onClick={(event) => event.preventDefault()}>
          Día
        </a>
        <input aria-label="Mes de prueba" type="month" />
        <input aria-label="Contraseña de prueba" type="password" />
        <button data-history-open-target="/ventas/mes?mes=2026-09">Mes anterior</button>
        <button disabled data-history-open-target="/ventas/mes?mes=2026-11">
          Mes siguiente
        </button>
      </main>
    </>
  );
}

describe('intervalo de renderizado de comprobación (T036, RNF-3)', () => {
  let clock = 100;
  let nextId = 0;
  let frames: Map<number, FrameRequestCallback>;
  beforeEach(() => {
    vi.stubEnv('VITE_HISTORY_MEASUREMENT', 'true');
    window.history.replaceState({}, '', '/ventas/mes?mes=2026-10');
    frames = new Map();
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function paint() {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(clock);
  }
  it('mide desde el enlace hasta los datos y dos cuadros; ignora la inspección posterior', () => {
    clock = 100;
    const view = render(<Probe />);
    const main = view.container.querySelector('main')!;
    fireEvent.click(view.getByText('Día'));
    view.rerender(<Probe readyKey="/ventas?fecha=2026-09-15" loading />);
    paint();
    paint();
    expect(main).not.toHaveAttribute('data-history-duration-ms');
    clock = 300;
    view.rerender(<Probe readyKey="/ventas?fecha=2026-09-15" />);
    paint();
    expect(main).not.toHaveAttribute('data-history-duration-ms');
    clock = 350;
    paint();
    expect(main).toHaveAttribute('data-history-duration-ms', '250');
    expect(main).toHaveAttribute('data-history-target', '/ventas?fecha=2026-09-15');
    expect(main).toHaveAttribute('data-history-focus-ok', 'true');
    clock = 5000;
    paint();
    expect(main).toHaveAttribute('data-history-duration-ms', '250');
  });
  it('captura la elección de mes sin leer campos de autenticación', () => {
    clock = 100;
    const view = render(<Probe />);
    const main = view.container.querySelector('main')!;
    fireEvent.input(view.getByLabelText('Contraseña de prueba'), { target: { value: 'ficticia' } });
    view.rerender(<Probe readyKey="/ventas/mes?mes=2026-09" />);
    paint();
    paint();
    expect(main).not.toHaveAttribute('data-history-duration-ms');
    fireEvent.input(view.getByLabelText('Mes de prueba'), { target: { value: '2026-09' } });
    view.rerender(<Probe readyKey="/ventas/mes?mes=2026-09" loading />);
    view.rerender(<Probe readyKey="/ventas/mes?mes=2026-09" />);
    clock = 200;
    paint();
    paint();
    expect(main).toHaveAttribute('data-history-duration-ms', '100');
  });
  it('invalida el intervalo si se pierde el foco durante la carga', () => {
    clock = 100;
    const view = render(<Probe />);
    fireEvent.click(view.getByText('Día'));
    fireEvent(window, new Event('blur'));
    view.rerender(<Probe readyKey="/ventas?fecha=2026-09-15" />);
    clock = 300;
    paint();
    paint();
    expect(view.container.querySelector('main')).toHaveAttribute('data-history-focus-ok', 'false');
  });
  it('mide la apertura con el botón del mes e ignora los botones deshabilitados', () => {
    clock = 100;
    const view = render(<Probe />);
    const main = view.container.querySelector('main')!;
    fireEvent.click(view.getByText('Mes siguiente'));
    view.rerender(<Probe readyKey="/ventas/mes?mes=2026-11" />);
    paint();
    paint();
    expect(main).not.toHaveAttribute('data-history-duration-ms');
    fireEvent.click(view.getByText('Mes anterior'));
    view.rerender(<Probe readyKey="/ventas/mes?mes=2026-09" />);
    clock = 300;
    paint();
    paint();
    expect(main).toHaveAttribute('data-history-duration-ms', '200');
    expect(main).toHaveAttribute('data-history-target', '/ventas/mes?mes=2026-09');
  });
  it('no acredita datos anteriores para un destino distinto', () => {
    const view = render(<Probe />);
    fireEvent.click(view.getByText('Día'));
    view.rerender(<Probe readyKey="/ventas?fecha=2026-09-14" />);
    paint();
    paint();
    expect(view.container.querySelector('main')).not.toHaveAttribute('data-history-duration-ms');
  });
  it('no instrumenta una ejecución normal sin la variable de comprobación', () => {
    vi.stubEnv('VITE_HISTORY_MEASUREMENT', 'false');
    const view = render(<Probe />);
    fireEvent.click(view.getByText('Día'));
    view.rerender(<Probe readyKey="/ventas?fecha=2026-09-15" />);
    paint();
    paint();
    expect(view.container.querySelector('main')).not.toHaveAttribute('data-history-duration-ms');
  });
});
