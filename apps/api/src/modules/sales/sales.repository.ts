import type { PaymentMethod, Role, Sale, SaleLine } from '@kofi/contracts';
import type { Queryable } from '../../shared/database/database.ts';

// Acceso a sale_counter, sales y sale_lines (RF-6, RF-8, RF-10, RF-11). Los importes ya llegan
// calculados por el servicio; la base comprueba que cuadran (plan §4, D-4).

export interface NewSale {
  number: number;
  draftId: string;
  registeredAt: Date;
  registeredBy: { userId: string; displayName: string; role: Role };
  lines: SaleLine[];
  totalCents: number;
  paymentMethod: PaymentMethod;
}

// Incrementa el contador y bloquea su fila hasta el fin de la transacción: dos registros a la vez
// se ordenan, y si la transacción falla el número vuelve atrás (plan §5.3).
export async function nextSaleNumber(tx: Queryable): Promise<number> {
  const result = await tx.query<{ number: number }>(
    'UPDATE sale_counter SET last_number = last_number + 1 RETURNING last_number AS number',
  );
  return result.rows[0]!.number;
}

// Debe llamarse dentro de una transacción: el disparador diferido comprueba las líneas al confirmar.
export async function insertSale(tx: Queryable, sale: NewSale): Promise<Sale> {
  const inserted = await tx.query<{ id: string }>(
    `INSERT INTO sales (number, draft_id, registered_at, registered_by_user_id, registered_by_name,
       registered_by_role, total_cents, payment_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      sale.number,
      sale.draftId,
      sale.registeredAt,
      sale.registeredBy.userId,
      sale.registeredBy.displayName,
      sale.registeredBy.role,
      sale.totalCents,
      sale.paymentMethod,
    ],
  );
  const id = inserted.rows[0]!.id;
  for (const [index, line] of sale.lines.entries()) {
    await tx.query(
      `INSERT INTO sale_lines (sale_id, position, product_id, product_name, category_name,
         unit_price_cents, quantity, subtotal_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        index + 1,
        line.productId,
        line.productName,
        line.categoryName,
        line.unitPriceCents,
        line.quantity,
        line.subtotalCents,
      ],
    );
  }
  return {
    id,
    number: sale.number,
    registeredAt: sale.registeredAt.toISOString(),
    registeredBy: sale.registeredBy,
    lines: sale.lines,
    totalCents: sale.totalCents,
    paymentMethod: sale.paymentMethod,
  };
}

interface SaleRow {
  id: string;
  number: number;
  registeredAt: Date;
  userId: string | null;
  displayName: string;
  role: Role;
  totalCents: number;
  paymentMethod: PaymentMethod;
  lines: SaleLine[];
}

const SELECT_SALES = `
  SELECT s.id, s.number, s.registered_at AS "registeredAt", s.registered_by_user_id AS "userId",
    s.registered_by_name AS "displayName", s.registered_by_role AS "role",
    s.total_cents AS "totalCents", s.payment_method AS "paymentMethod",
    (SELECT json_agg(json_build_object(
        'productId', l.product_id, 'productName', l.product_name,
        'categoryName', l.category_name, 'quantity', l.quantity,
        'unitPriceCents', l.unit_price_cents, 'subtotalCents', l.subtotal_cents)
      ORDER BY l.position)
     FROM sale_lines l WHERE l.sale_id = s.id) AS lines
  FROM sales s`;

function toSale(row: SaleRow): Sale {
  return {
    id: row.id,
    number: row.number,
    registeredAt: new Date(row.registeredAt).toISOString(),
    registeredBy: { userId: row.userId, displayName: row.displayName, role: row.role },
    lines: row.lines,
    totalCents: row.totalCents,
    paymentMethod: row.paymentMethod,
  };
}

// La venta que salió de una venta en preparación, para registrarla una sola vez (RF-8, D-5).
export async function findSaleByDraftId(db: Queryable, draftId: string): Promise<Sale | null> {
  const result = await db.query<SaleRow>(`${SELECT_SALES} WHERE s.draft_id = $1`, [draftId]);
  return result.rows[0] ? toSale(result.rows[0]) : null;
}

// Ventas registradas con registered_at en [from, to), por número (RF-11, plan §6.3). La usarán el
// Dashboard y el Historial.
export async function listRegisteredSales(
  db: Queryable,
  { from, to }: { from?: Date; to?: Date } = {},
): Promise<Sale[]> {
  const result = await db.query<SaleRow>(
    `${SELECT_SALES}
     WHERE ($1::timestamptz IS NULL OR s.registered_at >= $1)
       AND ($2::timestamptz IS NULL OR s.registered_at < $2)
     ORDER BY s.number`,
    [from ?? null, to ?? null],
  );
  return result.rows.map(toSale);
}
