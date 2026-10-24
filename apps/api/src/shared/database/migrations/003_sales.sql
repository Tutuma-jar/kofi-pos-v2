-- SPEC-003 Ventas: número de venta, ventas registradas y sus líneas (plan §4).

-- Último número usado, en una sola fila (RF-6, RF-10; D-4). Registrar una venta incrementa esta
-- fila dentro de su transacción: la bloquea hasta el final y, si la venta falla, el ROLLBACK
-- devuelve el número, así que no quedan saltos.
CREATE TABLE sale_counter (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

INSERT INTO sale_counter DEFAULT VALUES;

-- Ventas registradas (RF-6, RF-8, RF-10, RF-11). Quién la registró se guarda con el nombre y el rol
-- del momento: si después se elimina la cuenta, registered_by_user_id pasa a NULL y lo demás queda.
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL UNIQUE CHECK (number >= 1),
  draft_id uuid NOT NULL UNIQUE,
  registered_at timestamptz NOT NULL,
  registered_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  registered_by_name text NOT NULL CHECK (char_length(registered_by_name) BETWEEN 1 AND 40),
  registered_by_role text NOT NULL CHECK (registered_by_role IN ('owner', 'cashier')),
  total_cents integer NOT NULL CHECK (total_cents >= 1)
);

CREATE INDEX sales_registered_at_idx ON sales (registered_at);

-- Líneas de cada venta, con el nombre, la categoría y el precio del momento (RF-6, RF-7, RF-11).
-- Los productos del menú no se borran (SPEC-002 RF-12); RESTRICT lo garantiza también aquí.
CREATE TABLE sale_lines (
  sale_id uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 30),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  product_name text NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 40),
  category_name text NOT NULL CHECK (char_length(category_name) BETWEEN 1 AND 30),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents BETWEEN 1 AND 100000),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents = unit_price_cents * quantity),
  PRIMARY KEY (sale_id, position),
  UNIQUE (sale_id, product_id)
);

-- Al confirmar la transacción, cada venta tiene de 1 a 30 líneas y su total es la suma exacta de
-- los subtotales (RF-9, RNF-2; D-4). Diferido: la venta y sus líneas se insertan por separado.
CREATE FUNCTION sales_check_lines() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  checked_sale_id uuid;
  line_count integer;
  lines_total bigint;
  sale_total integer;
BEGIN
  IF TG_TABLE_NAME = 'sales' THEN
    checked_sale_id := NEW.id;
  ELSE
    checked_sale_id := NEW.sale_id;
  END IF;
  SELECT total_cents INTO sale_total FROM sales WHERE id = checked_sale_id;
  SELECT count(*), coalesce(sum(subtotal_cents), 0) INTO line_count, lines_total
  FROM sale_lines WHERE sale_id = checked_sale_id;
  IF line_count NOT BETWEEN 1 AND 30 OR lines_total <> sale_total THEN
    RAISE EXCEPTION 'La venta % no cuadra con sus líneas', checked_sale_id USING ERRCODE = 'KS001';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER sales_check_lines
AFTER INSERT ON sales
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION sales_check_lines();

CREATE CONSTRAINT TRIGGER sale_lines_check_lines
AFTER INSERT ON sale_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION sales_check_lines();

-- Una venta registrada no cambia (RF-11; D-4). La única actualización permitida es la que hace
-- ON DELETE SET NULL al eliminar la cuenta que la registró.
CREATE FUNCTION sales_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.registered_by_user_id IS NOT NULL AND NEW.registered_by_user_id IS NULL
     AND (to_jsonb(NEW) - 'registered_by_user_id') = (to_jsonb(OLD) - 'registered_by_user_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Las ventas registradas no se modifican' USING ERRCODE = 'KS002';
END;
$$;

CREATE TRIGGER sales_immutable
BEFORE UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION sales_immutable();

CREATE FUNCTION sale_lines_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Las líneas de una venta registrada no se modifican' USING ERRCODE = 'KS002';
END;
$$;

CREATE TRIGGER sale_lines_immutable
BEFORE UPDATE OR DELETE ON sale_lines
FOR EACH ROW EXECUTE FUNCTION sale_lines_immutable();
