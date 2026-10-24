import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Pulsado {count} veces</button>;
}

describe('pruebas de componentes', () => {
  it('renderizan un componente y responden a la interacción', async () => {
    render(<Counter />);

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('Pulsado 1 veces');
  });
});
