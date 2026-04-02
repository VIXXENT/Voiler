import type { AppError, IUserRepository } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import type { Email, UserEntity, UserId } from '@voiler/domain'
import { errAsync, okAsync } from 'neverthrow'
import { describe, it, expect, vi } from 'vitest'

import { createCreateUser } from '../../use-cases/user/create-user'

/** Builds a fake UserEntity for test assertions. */
const makeFakeUser = (): UserEntity => ({
  id: 'user-1' as UserId,
  email: 'test@example.com' as Email,
  name: 'Test User',
  role: 'user',
  createdAt: new Date('2026-01-01'),
})

/** Builds a mock IUserRepository with vi.fn() stubs. */
const makeMockRepo = (): IUserRepository => ({
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
})

describe('createUser use case', () => {
  it('returns Ok(UserEntity) on happy path', async () => {
    const fakeUser = makeFakeUser()

    const repo = makeMockRepo()

    vi.mocked(repo.create).mockReturnValue(okAsync(fakeUser))

    const useCase = createCreateUser({
      userRepository: repo,
    })

    const result = await useCase({
      name: 'Test User',
      email: 'test@example.com',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toEqual(fakeUser)
    }
    expect(repo.create).toHaveBeenCalledWith({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      },
    })
  })

  it('returns Err when repository create fails', async () => {
    const repo = makeMockRepo()

    const repoError: AppError = infrastructureError({
      message: 'db error',
    })

    vi.mocked(repo.create).mockReturnValue(errAsync(repoError))

    const useCase = createCreateUser({
      userRepository: repo,
    })

    const result = await useCase({
      name: 'Test',
      email: 'test@example.com',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
