import { User, CreateUserInput } from '@gemtest/schema'
import { IRepository } from './base.repository'

/**
 * Interfaz para el repositorio de usuario
 */
export type IUserRepository = IRepository<User, CreateUserInput> & {
  findByEmail: (email: string) => Promise<User | null>;
};
