import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';

describe('@kofi/contracts', () => {
  it('se puede importar', () => {
    expect(contracts).toBeTypeOf('object');
  });
});
