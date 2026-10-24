import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';

describe('@kofi/contracts', () => {
  it('exporta el formato común de errores', () => {
    expect(contracts.apiErrorSchema).toBeDefined();
    expect(contracts.ERROR_CODES).toBeDefined();
  });
});
