import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '~/lib/auth'

/** Props for the AuthForm component. */
interface AuthFormProps {
  readonly mode: 'login' | 'register'
}

// TODO: i18n — replace hardcoded strings with t() calls
/** Reusable authentication form for login and registration. */
const AuthForm = ({ mode }: AuthFormProps) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const isLogin: boolean = mode === 'login'
  const title: string = isLogin ? 'Sign In' : 'Create Account'
  const submitLabel: string = isLogin ? 'Sign In' : 'Sign Up'

  const handleSubmit = async (
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isLogin) {
      const result = await authClient.signIn.email({
        email,
        password,
      })
      setLoading(false)
      if (result.error) {
        setError(result.error.message ?? 'Sign in failed')
        return
      }
    } else {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      })
      setLoading(false)
      if (result.error) {
        setError(result.error.message ?? 'Sign up failed')
        return
      }
    }

    await navigate({ to: '/dashboard' })
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">{title}</h1>
      {error !== null && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {!isLogin && (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              required={!isLogin}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="********"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {isLogin ? (
          <>
            {"Don't have an account? "}
            <Link to="/auth/register" className="font-medium text-blue-600 hover:text-blue-800">
              Sign up
            </Link>
          </>
        ) : (
          <>
            {'Already have an account? '}
            <Link to="/auth/login" className="font-medium text-blue-600 hover:text-blue-800">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

export { AuthForm }
