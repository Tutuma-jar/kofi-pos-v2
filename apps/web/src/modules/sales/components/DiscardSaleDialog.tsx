import { useEffect, useRef } from 'react';

export function DiscardSaleDialog({
  busy,
  onDiscard,
  onBack,
}: {
  busy: boolean;
  onDiscard(): void;
  onBack(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const modal = dialog.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.showModal();
    back.current?.focus();
    return () => {
      modal.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="discard-sale-title"
      onCancel={(event) => {
        event.preventDefault();
        onBack();
      }}
    >
      <h2 id="discard-sale-title">¿Descartar esta venta? Se quitarán todos sus productos</h2>
      <button type="button" ref={back} onClick={onBack}>
        Volver
      </button>
      <button type="button" disabled={busy} onClick={onDiscard}>
        Descartar
      </button>
    </dialog>
  );
}
