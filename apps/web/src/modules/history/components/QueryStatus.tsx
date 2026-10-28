import { formatDateTime } from '@kofi/contracts';

interface QueryStatusProps {
  data?: { asOf?: string } | null;
  loading: boolean;
  notice: string | null;
  rejection: string | null;
  refresh(): void | Promise<void>;
}

export function QueryStatus({ data, loading, notice, rejection, refresh }: QueryStatusProps) {
  return (
    <div className="history-status">
      <div className="history-status__actions">
        {data?.asOf && <p>Datos al {formatDateTime(data.asOf)}</p>}
        <button type="button" disabled={loading} onClick={() => void refresh()}>
          Actualizar
        </button>
        {loading && <p role="status">Cargando…</p>}
      </div>
      {notice && (
        <p className="alert" role="alert">
          {notice}
        </p>
      )}
      {rejection && (
        <p className="alert" role="alert">
          {rejection}
        </p>
      )}
    </div>
  );
}
