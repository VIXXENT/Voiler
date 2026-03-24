import { test, expect } from '@playwright/test'

/**
 * Authentication E2E tests — sequential flow.
 *
 * Tests run in order because login depends on a registered user,
 * and logout depends on an active session.
 */
test.describe.serial('Authentication Flow', () => {
  const timestamp: number = Date.now()
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test-${timestamp}@example.com`,
    password: 'Password123!',
  }

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Registrarse/i }).click()

    await page.getByPlaceholder(/Nombre completo/i).fill(testUser.name)
    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)

    await page.getByRole('button', { name: /Confirmar Registro/i }).click()

    // Registration closes form and user appears in list
    await expect(
      page.getByRole('heading', { name: /Crear Cuenta/i }),
    ).not.toBeVisible({ timeout: 15000 })

    await expect(page.getByText(testUser.name)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(testUser.email)).toBeVisible({ timeout: 15000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await page.getByPlaceholder(/Email/i).fill('wrong@example.com')
    await page.getByPlaceholder(/Contraseña/i).fill('wrongpassword')

    await page.getByRole('button', { name: /Acceder/i }).click()

    // Error message should appear in the login form
    await expect(
      page.getByText(/Invalid credentials/i),
    ).toBeVisible({ timeout: 10000 })

    // User should still see the login form (not redirected)
    await expect(
      page.getByRole('button', { name: /Acceder/i }),
    ).toBeVisible()
  })

  test('should login with the registered user', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)

    await page.getByRole('button', { name: /Acceder/i }).click()

    // Wait for session to be established then reload for cookie sync
    await page.waitForTimeout(1000)
    await page.reload({ waitUntil: 'networkidle' })

    // Verify session state — user name or email and logout button visible
    await expect(
      page.getByRole('button', { name: /Salir/i }),
    ).toBeVisible({ timeout: 20000 })
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/')
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)
    await page.getByRole('button', { name: /Acceder/i }).click()
    await page.waitForTimeout(1000)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(
      page.getByRole('button', { name: /Salir/i }),
    ).toBeVisible({ timeout: 20000 })

    // Now reload again — session should survive
    await page.reload({ waitUntil: 'networkidle' })
    await expect(
      page.getByRole('button', { name: /Salir/i }),
    ).toBeVisible({ timeout: 15000 })
  })

  test('should logout correctly', async ({ page }) => {
    // Login first
    await page.goto('/')
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)
    await page.getByRole('button', { name: /Acceder/i }).click()
    await page.waitForTimeout(1000)
    await page.reload({ waitUntil: 'networkidle' })

    const logoutBtn = page.getByRole('button', { name: /Salir/i })
    await expect(logoutBtn).toBeVisible({ timeout: 20000 })

    await logoutBtn.click()

    // Wait for signOut to process, then reload to sync state
    await page.waitForTimeout(2000)
    await page.reload({ waitUntil: 'networkidle' })

    // Wait for session loading to resolve before asserting
    await expect(
      page.getByText(/Verificando sesión/i),
    ).not.toBeVisible({ timeout: 15000 })

    // Back to unauthenticated state
    await expect(
      page.getByRole('button', { name: /Iniciar Sesión/i }),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('button', { name: /Registrarse/i }),
    ).toBeVisible()
  })
})
