import { accountInputSchema } from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { validate } from '../../shared/http/validate.ts';
import { toSessionUser } from './auth.service.ts';
import { hashPassword } from './passwords.service.ts';
import { insertUser, listUsers } from './users.repository.ts';

export function createAccountsService(db: Database) {
  return {
    async create(input: unknown) {
      const account = validate(accountInputSchema, input);
      const passwordHash = await hashPassword(account.password);
      try {
        return toSessionUser(await insertUser(db, account, passwordHash));
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        ) {
          const message = `Ya existe una cuenta con el usuario ${account.username}`;
          throw new AppError(409, 'VALIDATION_ERROR', message, { fields: { username: message } });
        }
        throw error;
      }
    },
    async list() {
      return (await listUsers(db)).map(toSessionUser);
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
