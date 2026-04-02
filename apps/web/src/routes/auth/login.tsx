import { createFileRoute } from '@tanstack/react-router'

import { AuthForm } from '~/components/AuthForm'

/** Login page route component. */
const LoginPage = () => <AuthForm mode="login" />

const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

export { Route }
