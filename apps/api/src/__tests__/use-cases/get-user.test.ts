import type { IUserRepository } from '@voiler/core'
import type { Email, UserEntity, UserId } from '@voiler/domain'
import { okAsync } from 'neverthrow'
import { describe, it, expect, vi } from 'vitest'

import { createGetUser } from '../../use-cases/user/get-user'

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

describe('getUser use case', () => {
  it('returns Ok(UserEntity) when user is found', async () => {
    const fakeUser = makeFakeUser()

    const repo = makeMockRepo()

    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeUser))

    const useCase = createGetUser({
      userRepository: repo,
    })

    const result = await useCase({ id: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toEqual(fakeUser)
    }
    expect(repo.findById).toHaveBeenCalledWith({
      id: 'user-1',
    })
  })

  it('returns Ok(null) when user is not found', async () => {
    const repo = makeMockRepo()

    vi.mocked(repo.findById).mockReturnValue(okAsync(null))

    const useCase = createGetUser({
      userRepository: repo,
    })

    const result = await useCase({ id: 'nonexistent' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBeNull()
    }
  })
})
