import { accountInputSchema } from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { validate } from '../../shared/http/validate.ts';
import { toSessionUser } from './auth.service.ts';
import { hashPassword } from './passwords.service.ts';
import { deleteUser, insertUser, listUsers, updateUser } from './users.repository.ts';

const updateSchema = accountInputSchema
  .omit({ username: true })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'Indica al menos un dato para actualizar');
const usernameSchema = accountInputSchema.shape.username;
const missingAccount = () => new AppError(404, 'VALIDATION_ERROR', 'No existe esa cuenta');

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
    async update(username: unknown, input: unknown) {
      const name = validate(usernameSchema, username);
      const changes = validate(updateSchema, input);
      const passwordHash =
        changes.password === undefined ? undefined : await hashPassword(changes.password);
      const user = await updateUser(db, name, {
        ...(changes.displayName === undefined ? {} : { displayName: changes.displayName }),
        ...(changes.role === undefined ? {} : { role: changes.role }),
        ...(passwordHash === undefined ? {} : { passwordHash }),
      });
      if (!user) throw missingAccount();
      return toSessionUser(user);
    },
    async delete(username: unknown) {
      const name = validate(usernameSchema, username);
      if (!(await deleteUser(db, name))) throw missingAccount();
      return { username: name };
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
