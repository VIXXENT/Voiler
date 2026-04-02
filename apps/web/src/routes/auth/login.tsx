import { createFileRoute } from '@tanstack/react-router'

import { AuthForm } from '~/components/AuthForm'

/** Login page route component. */
const LoginPage = () => <AuthForm mode="login" />

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

export { Route }
