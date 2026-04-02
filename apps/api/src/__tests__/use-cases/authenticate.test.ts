import type { AppError, IPasswordService, ITokenService, IUserRepository } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import type { Email, UserEntity, UserId } from '@voiler/domain'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'
import { describe, it, expect, vi } from 'vitest'

import { createAuthenticate } from '../../use-cases/auth/authenticate'

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

/** Builds a mock IPasswordService with vi.fn() stubs. */
const makeMockPasswordService = (): IPasswordService => ({
  hash: vi.fn(),
  verify: vi.fn(),
})

/** Builds a mock ITokenService with vi.fn() stubs. */
const makeMockTokenService = (): ITokenService => ({
  generate: vi.fn(),
  verify: vi.fn(),
})

/**
 * Builds a mock findPasswordHash function.
 */
const makeMockFindPasswordHash = (): ((params: {
  email: string
}) => ResultAsync<string | null, AppError>) => vi.fn()

describe('authenticate use case', () => {
  it('returns Ok(AuthResult) on happy path', async () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const fakeUser = makeFakeUser()
    // eslint-disable-next-line @typescript-eslint/typedef
    const repo = makeMockRepo()
    // eslint-disable-next-line @typescript-eslint/typedef
    const passwordService = makeMockPasswordService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const tokenService = makeMockTokenService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const findPasswordHash = makeMockFindPasswordHash()

    vi.mocked(repo.findByEmail).mockReturnValue(okAsync(fakeUser))
    vi.mocked(findPasswordHash).mockReturnValue(okAsync('stored-hash'))
    vi.mocked(passwordService.verify).mockReturnValue(okAsync(true))
    vi.mocked(tokenService.generate).mockReturnValue(okAsync('jwt-token-123'))

    // eslint-disable-next-line @typescript-eslint/typedef
    const useCase = createAuthenticate({
      userRepository: repo,
      passwordService,
      tokenService,
      findPasswordHash,
    })

    // eslint-disable-next-line @typescript-eslint/typedef
    const result = await useCase({
      email: 'test@example.com',
      password: 'Pass1234',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.token).toBe('jwt-token-123')
      expect(result.value.user).toEqual(fakeUser)
    }
  })

  it('returns Err(InvalidPassword) when user not found — no enumeration', async () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const repo = makeMockRepo()
    // eslint-disable-next-line @typescript-eslint/typedef
    const passwordService = makeMockPasswordService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const tokenService = makeMockTokenService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const findPasswordHash = makeMockFindPasswordHash()

    vi.mocked(repo.findByEmail).mockReturnValue(okAsync(null))
    // Dummy hash runs to equalize timing
    vi.mocked(passwordService.hash).mockReturnValue(okAsync('dummy-hash'))

    // eslint-disable-next-line @typescript-eslint/typedef
    const useCase = createAuthenticate({
      userRepository: repo,
      passwordService,
      tokenService,
      findPasswordHash,
    })

    // eslint-disable-next-line @typescript-eslint/typedef
    const result = await useCase({
      email: 'test@example.com',
      password: 'Pass1234',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      // Must NOT reveal UserNotFound — prevents
      // user enumeration attacks.
      expect(result.error.tag).toBe('InvalidPassword')
      expect(result.error.message).toBe('Invalid credentials')
    }
    // Verify dummy hash was called for timing
    expect(passwordService.hash).toHaveBeenCalledWith({
      plaintext: 'Pass1234',
    })
  })

  it('returns Err(InvalidPassword) on wrong password', async () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const fakeUser = makeFakeUser()
    // eslint-disable-next-line @typescript-eslint/typedef
    const repo = makeMockRepo()
    // eslint-disable-next-line @typescript-eslint/typedef
    const passwordService = makeMockPasswordService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const tokenService = makeMockTokenService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const findPasswordHash = makeMockFindPasswordHash()

    vi.mocked(repo.findByEmail).mockReturnValue(okAsync(fakeUser))
    vi.mocked(findPasswordHash).mockReturnValue(okAsync('stored-hash'))
    vi.mocked(passwordService.verify).mockReturnValue(okAsync(false))

    // eslint-disable-next-line @typescript-eslint/typedef
    const useCase = createAuthenticate({
      userRepository: repo,
      passwordService,
      tokenService,
      findPasswordHash,
    })

    // eslint-disable-next-line @typescript-eslint/typedef
    const result = await useCase({
      email: 'test@example.com',
      password: 'WrongPass1',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidPassword')
    }
  })

  it('returns Err when token generation fails', async () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const fakeUser = makeFakeUser()
    // eslint-disable-next-line @typescript-eslint/typedef
    const repo = makeMockRepo()
    // eslint-disable-next-line @typescript-eslint/typedef
    const passwordService = makeMockPasswordService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const tokenService = makeMockTokenService()
    // eslint-disable-next-line @typescript-eslint/typedef
    const findPasswordHash = makeMockFindPasswordHash()

    // eslint-disable-next-line @typescript-eslint/typedef
    const tokenError = infrastructureError({
      message: 'token gen failed',
    })

    vi.mocked(repo.findByEmail).mockReturnValue(okAsync(fakeUser))
    vi.mocked(findPasswordHash).mockReturnValue(okAsync('stored-hash'))
    vi.mocked(passwordService.verify).mockReturnValue(okAsync(true))
    vi.mocked(tokenService.generate).mockReturnValue(errAsync(tokenError))

    // eslint-disable-next-line @typescript-eslint/typedef
    const useCase = createAuthenticate({
      userRepository: repo,
      passwordService,
      tokenService,
      findPasswordHash,
    })

    // eslint-disable-next-line @typescript-eslint/typedef
    const result = await useCase({
      email: 'test@example.com',
      password: 'Pass1234',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
