import { Link, useParams } from 'react-router';
import { useHistoryClient } from '../api/HistoryClientProvider.tsx';
import { useHistoryQuery } from '../state/useHistoryQuery.ts';
import { SaleDetailView } from '../components/SaleDetailView.tsx';
import { SaleSearch } from '../components/SaleSearch.tsx';
import { QueryStatus } from '../components/QueryStatus.tsx';
import { useHistoryTiming } from '../state/useHistoryTiming.ts';
import '../history.css';

export function SaleDetailPage() {
  const client = useHistoryClient();
  const { numero = '' } = useParams();
  const query = useHistoryQuery(() => client.sale(numero), numero);
  const { data } = query;
  const timing = useHistoryTiming(data ? `/ventas/${data.sale.number}` : null, query.loading);
  return (
    <main className="history history--detail" ref={timing}>
      <header className="history-header">
        <div>
          <h1>{data ? `Venta N.º ${data.sale.number}` : 'Detalle de una venta'}</h1>
          <p>
            <Link to="/">Volver al inicio</Link>
          </p>
        </div>
        <SaleSearch />
      </header>
      {data && (
        <>
          <SaleDetailView sale={data.sale} />
          <p className="history-back">
            <Link to={`/ventas?fecha=${data.date}`}>Volver</Link>
          </p>
        </>
      )}
      <QueryStatus
        loading={query.loading}
        notice={query.notice}
        rejection={query.rejection}
        refresh={query.refresh}
      />
    </main>
  );
}
