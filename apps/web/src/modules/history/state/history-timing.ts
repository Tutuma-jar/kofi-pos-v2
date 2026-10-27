interface PendingMeasurement {
  target: string;
  startedAt: number;
  lostFocus: boolean;
}

let pending: PendingMeasurement | null = null;

function routeKey(raw: string) {
  const url = new URL(raw, window.location.href);
  const field = url.pathname === '/ventas/mes' ? 'mes' : 'fecha';
  const value = url.searchParams.get(field);
  return url.pathname + (value ? `?${field}=${value}` : '');
}

export function installHistoryTiming() {
  function start(target: string) {
    const main = document.querySelector('main');
    for (const attribute of [
      'data-history-duration-ms',
      'data-history-target',
      'data-history-focus-ok',
    ])
      main?.removeAttribute(attribute);
    pending = {
      target: routeKey(target),
      startedAt: performance.now(),
      lostFocus: document.visibilityState !== 'visible' || !document.hasFocus(),
    };
  }
  function click(event: MouseEvent) {
    const button =
      event.target instanceof Element
        ? event.target.closest('button[data-history-open-target]')
        : null;
    if (button instanceof HTMLButtonElement) {
      if (!button.disabled) start(button.dataset.historyOpenTarget!);
      return;
    }
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const url = new URL(anchor.href);
    if (url.origin === window.location.origin && /^\/ventas(?:\/mes|\/\d+)?$/.test(url.pathname))
      start(anchor.href);
  }
  function input(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !window.location.pathname.startsWith('/ventas'))
      return;
    if (target.type === 'month') start(`/ventas/mes?mes=${target.value}`);
    else if (target.type === 'date') start(`/ventas?fecha=${target.value}`);
  }
  function loseFocus() {
    if (pending) pending.lostFocus = true;
  }
  function visibility() {
    if (document.visibilityState !== 'visible') loseFocus();
  }
  document.addEventListener('click', click, true);
  document.addEventListener('input', input, true);
  window.addEventListener('blur', loseFocus);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    pending = null;
    document.removeEventListener('click', click, true);
    document.removeEventListener('input', input, true);
    window.removeEventListener('blur', loseFocus);
    document.removeEventListener('visibilitychange', visibility);
  };
}

export function finishHistoryTiming(main: HTMLElement, readyKey: string) {
  const record = pending;
  if (!record || (record.target !== readyKey && record.target !== readyKey.split('?')[0])) return;
  let second = 0;
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(() => {
      if (pending !== record || !main.isConnected) return;
      main.dataset.historyDurationMs = String(performance.now() - record.startedAt);
      main.dataset.historyTarget = readyKey;
      main.dataset.historyFocusOk = String(
        !record.lostFocus && document.visibilityState === 'visible' && document.hasFocus(),
      );
      pending = null;
    });
  });
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
  };
}
