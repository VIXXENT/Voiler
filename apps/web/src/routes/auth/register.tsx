import { createFileRoute } from '@tanstack/react-router'

import { AuthForm } from '~/components/AuthForm'

/** Register page route component. */
const RegisterPage = () => <AuthForm mode="register" />

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})

export { Route }
