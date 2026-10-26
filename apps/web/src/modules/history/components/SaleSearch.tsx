import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { HISTORY_MESSAGES, parseSaleNumber } from '@kofi/contracts';

export function SaleSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const number = parseSaleNumber(text);
        if (number === null) {
          setError(HISTORY_MESSAGES.invalidSaleNumber);
          return;
        }
        setError(null);
        void navigate(`/ventas/${number}`);
      }}
    >
      <label>
        Buscar venta por número{' '}
        <input
          type="text"
          inputMode="numeric"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
        />
      </label>
      <button type="submit">Buscar</button>
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
