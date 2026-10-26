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
    <>
      {data?.asOf && <p>Datos al {formatDateTime(data.asOf)}</p>}
      <button type="button" disabled={loading} onClick={() => void refresh()}>
        Actualizar
      </button>
      {loading && <p role="status">Cargando…</p>}
      {notice && <p role="alert">{notice}</p>}
      {rejection && <p role="alert">{rejection}</p>}
    </>
  );
}
