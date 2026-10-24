-- SPEC-002 Menú: categorías y productos (plan §4).

-- Categorías (RF-2, RF-3, RF-10 a RF-12). name_key es la clave de «Comparación de nombres», que
-- calcula la API (menuNameKey del contrato).
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  name_key text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Productos (RF-2, RF-4 a RF-6, RF-9, RF-12, RF-15). El nombre es único en todo el menú, también
-- entre inactivos; el precio va en centavos de boliviano (Bs 0,01 a Bs 1000,00). Las categorías
-- con productos no se borran: el menú no tiene eliminación (RF-12).
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  name_key text NOT NULL UNIQUE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 1 AND 100000),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_category_id_idx ON products (category_id);

-- Ningún producto activo en una categoría inactiva (RF-8, RF-11; D-5). FOR SHARE hace esperar a
-- quien desactiva la categoría hasta que esta transacción termine, y al revés.
CREATE FUNCTION products_require_active_category() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  category_active boolean;
BEGIN
  IF NEW.active THEN
    SELECT active INTO category_active FROM categories WHERE id = NEW.category_id FOR SHARE;
    IF category_active IS NOT TRUE THEN
      RAISE EXCEPTION 'La categoría % no está activa', NEW.category_id USING ERRCODE = 'KM001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_require_active_category
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION products_require_active_category();

-- Una categoría con productos activos no se desactiva (RF-8, RF-10; D-5).
CREATE FUNCTION categories_keep_active_products() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.active AND NOT NEW.active
     AND EXISTS (SELECT 1 FROM products WHERE category_id = NEW.id AND active) THEN
    RAISE EXCEPTION 'La categoría % tiene productos activos', NEW.id USING ERRCODE = 'KM002';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_keep_active_products
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION categories_keep_active_products();
