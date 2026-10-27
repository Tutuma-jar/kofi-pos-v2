export type SaveState = 'saving' | 'saved' | 'offline' | null;

export function SaveStatus({ state }: { state: SaveState }) {
  if (!state) return null;
  if (state === 'offline')
    return (
      <p className="alert" role="alert">
        No hay conexión. Los cambios no se guardaron
      </p>
    );
  return (
    <p className="notice" role="status">
      {state === 'saved' ? 'Cambios guardados' : 'Guardando…'}
    </p>
  );
}
