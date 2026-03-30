import { Button } from '@gemtest/ui'
import { type PublicUser } from '@gemtest/schema'
import {
  useQuery,
  useMutation,
  gql,
  type DocumentNode,
  type ApolloError,
} from '@apollo/client'
import { useState, type ReactElement, type ChangeEvent, type FormEvent } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

const GET_USERS: DocumentNode = gql`
  query GetUsers {
    health
    users {
      id
      name
      email
    }
  }
`

const CREATE_USER: DocumentNode = gql`
  mutation CreateUser($name: String!, $email: String!, $password: String!) {
    createUser(name: $name, email: $email, password: $password) {
      id
      name
      email
    }
  }
`

type GetUsersData = {
  readonly health: string
  readonly users: PublicUser[]
}

type HandleRegisterFn = (e: FormEvent) => void
type HandleLoginFn = (e: FormEvent) => Promise<void>
type ToggleRegisterFn = () => void
type ToggleLoginViewFn = () => void

/**
 * Main App component.
 *
 * This component serves as the dashboard for the GemTest monorepo. It manages
 * authentication state via Auth.js, user registration via GraphQL mutations,
 * and displays a list of registered users.
 *
 * @returns A ReactElement representing the dashboard.
 */
const App: React.FC = (): ReactElement => {
  const { data: session, status } = useSession()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState<string | null>(null)

  const { loading, error, data, refetch } = useQuery<GetUsersData>(GET_USERS)
  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    onCompleted: (): void => {
      setIsRegistering(false)
      setForm({ name: '', email: '', password: '' })
      refetch().catch((err: unknown): void => {
        console.error('Refetch failed after registration:', err)
      })
    },
    onError: (err: ApolloError): void => {
      console.error('Registration failed:', err.message)
    },
  })

  /**
   * Handles user registration form submission.
   *
   * @param e - The form submission event.
   */
  const handleRegister: HandleRegisterFn = (e: FormEvent): void => {
    e.preventDefault()
    createUser({ variables: form }).catch((err: unknown): void => {
      console.error('Create user mutation failed:', err)
    })
  }

  /**
   * Handles login form submission using Auth.js credentials provider.
   *
   * @param e - The form submission event.
   */
  const handleLogin: HandleLoginFn = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setLoginError(null)
    try {
      const result: Awaited<ReturnType<typeof signIn>> = await signIn('credentials', {
        email: loginForm.email,
        password: loginForm.password,
        redirect: false,
      })
      if (result?.error) {
        setLoginError('Invalid credentials. Please try again.')
      } else {
        setIsLoggingIn(false)
        setLoginForm({ email: '', password: '' })
      }
    } catch {
      setLoginError('Network error. Please check your connection.')
    }
  }

  /**
   * Toggles the visibility of the registration form.
   */
  const toggleRegister: ToggleRegisterFn = (): void => {
    setIsRegistering(!isRegistering)
    setIsLoggingIn(false)
  }

  /**
   * Toggles the visibility of the login form.
   */
  const toggleLoginView: ToggleLoginViewFn = (): void => {
    setIsLoggingIn(!isLoggingIn)
    setIsRegistering(false)
    setLoginError(null)
  }

  const isLoadingSession = status === 'loading'

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        <header className="flex justify-between items-center mb-10 border-b pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">
              GemTest Monorepo
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Arquitectura Fullstack Profesional
            </p>
          </div>

          <div className="flex gap-4 items-center">
            {isLoadingSession ? (
              <span className="text-xs text-gray-400">Verificando sesión...</span>
            ) : session ? (
              <div
                className="flex items-center gap-4 bg-indigo-50 px-4 py-2
                  rounded-full border border-indigo-100"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-indigo-700 font-semibold leading-tight">
                    👤 {session.user?.name || session.user?.email}
                  </span>
                  {session.user?.email && (
                    <span className="text-[10px] text-indigo-400">
                      {session.user.email}
                    </span>
                  )}
                </div>
                <button
                  onClick={(): Promise<void> => signOut()}
                  className="text-xs text-red-500 font-bold hover:text-red-700
                    uppercase tracking-wider ml-2"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex gap-4 items-center">
                <button
                  onClick={toggleRegister}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Registrarse
                </button>
                <button
                  onClick={toggleLoginView}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-full
                    font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                >
                  Iniciar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vistas de Autenticación / Registro */}
          <div className="space-y-6">
            {isRegistering ? (
              <section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Crear Cuenta</h2>
                <form onSubmit={handleRegister} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    required
                    className="w-full p-2 border rounded-md"
                    value={form.name}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                      setForm({ ...form, name: e.target.value })
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full p-2 border rounded-md"
                    value={form.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                      setForm({ ...form, email: e.target.value })
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    required
                    className="w-full p-2 border rounded-md"
                    value={form.password}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                      setForm({ ...form, password: e.target.value })
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={creating}
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-md
                        font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {creating ? 'Registrando...' : 'Confirmar Registro'}
                    </button>
                    <button
                      type="button"
                      onClick={toggleRegister}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md
                        font-bold hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </section>
            ) : isLoggingIn ? (
              <section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Bienvenido de nuevo</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginError && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md border border-red-200">
                      {loginError}
                    </div>
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full p-2 border rounded-md"
                    value={loginForm.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    required
                    className="w-full p-2 border rounded-md"
                    value={loginForm.password}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-md
                        font-bold hover:bg-indigo-700"
                    >
                      Acceder
                    </button>
                    <button
                      type="button"
                      onClick={toggleLoginView}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md
                        font-bold hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800">
                  🚀 Componentes Compartidos
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Prueba la interactividad de la librería UI compartida y verifica la comunicación
                  con la API Apollo en tiempo real.
                </p>
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={(): void => {
                      console.info('Shared UI Library interacted!')
                    }}
                  >
                    Interactuar con UI Lib
                  </Button>
                  <Button
                    onClick={(): void => {
                      signIn('google').catch((err: unknown): void => {
                        console.error('Google OAuth failed:', err)
                      })
                    }}
                    className="bg-white !text-gray-700 border border-gray-300 hover:bg-gray-50"
                  >
                    Login con Google (OAuth)
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* Listado de Usuarios */}
          <section className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📡 API / Usuarios</h2>
            {loading && <p className="text-gray-400">Cargando...</p>}
            {error && (
              <div className="text-red-500 text-sm">
                {error.message}
              </div>
            )}
            {data?.users && (
              <ul className="space-y-3">
                {data.users.map((user: PublicUser): ReactElement => (
                  <li
                    key={user.id}
                    className="bg-white p-3 rounded shadow-sm border border-gray-200
                      flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-700">{user.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{user.email}</span>
                  </li>
                ))}
                {data.users.length === 0 && (
                  <p className="text-gray-400 italic text-center">Sin usuarios.</p>
                )}
              </ul>
            )}
          </section>
        </main>

        <footer className="mt-12 text-center text-gray-400 text-xs border-t pt-6">
          GemTest • Turborepo • pnpm • React • Apollo • Drizzle • Auth.js
        </footer>
      </div>
    </div>
  )
}

export default App
