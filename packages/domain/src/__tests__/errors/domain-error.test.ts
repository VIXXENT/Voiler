import { describe, it, expect } from 'vitest'

import {
  invalidEmail,
  invalidPassword,
  weakPassword,
  userNotFound,
  userAlreadyExists,
} from '../../errors/domain-error'

describe('DomainError constructors', () => {
  it('invalidEmail creates correct tag and message', () => {
    const error = invalidEmail('bad email')

    expect(error.tag).toBe('InvalidEmail')
    expect(error.message).toBe('bad email')
  })

  it('invalidPassword creates correct tag and message', () => {
    const error = invalidPassword('too short')

    expect(error.tag).toBe('InvalidPassword')
    expect(error.message).toBe('too short')
  })

  it('weakPassword creates correct tag and message', () => {
    const error = weakPassword('needs digit')

    expect(error.tag).toBe('WeakPassword')
    expect(error.message).toBe('needs digit')
  })

  it('userNotFound creates correct tag and message', () => {
    const error = userNotFound('no user')

    expect(error.tag).toBe('UserNotFound')
    expect(error.message).toBe('no user')
  })

  it('userAlreadyExists creates correct tag and message', () => {
    const error = userAlreadyExists('duplicate')

    expect(error.tag).toBe('UserAlreadyExists')
    expect(error.message).toBe('duplicate')
  })
})
