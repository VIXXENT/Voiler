import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to avoid CSRF issues between tests
    await context.clearCookies()
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()))
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message))
  })

  const timestamp = Date.now()
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test-${timestamp}@example.com`,
    password: 'Password123!',
  }

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/')

    // Open registration form
    await page.getByRole('button', { name: /Registrarse/i }).click()

    // Fill registration form
    await page.getByPlaceholder(/Nombre completo/i).fill(testUser.name)
    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)

    // Submit
    await page.getByRole('button', { name: /Confirmar Registro/i }).click()

    // Registration should close form and add user to list
    // (In App.tsx: setIsRegistering(false) and refetch)
    await expect(page.getByRole('heading', { name: /Crear Cuenta/i })).not.toBeVisible({ timeout: 15000 })

    // Verify user appears in the list
    await expect(page.getByText(testUser.name)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(testUser.email)).toBeVisible({ timeout: 15000 })
  })

  test('should login with the registered user', async ({ page }) => {
    await page.goto('/')

    // Open login form
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    // Fill login form
    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)

    // Submit
    await page.getByRole('button', { name: /Acceder/i }).click()

    // Force reload to ensure cookies are synced and session is picked up
    await page.reload({ waitUntil: 'networkidle' })

    // Verify session state (Logout button appears)
    await expect(page.getByRole('button', { name: /Salir/i })).toBeVisible({ timeout: 20000 })
  })

  test('should logout correctly', async ({ page }) => {
    // We need to login first
    await page.goto('/')
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await page.getByPlaceholder(/Email/i).fill(testUser.email)
    await page.getByPlaceholder(/Contraseña/i).fill(testUser.password)
    await page.getByRole('button', { name: /Acceder/i }).click()

    // Force reload for stability
    await page.reload({ waitUntil: 'networkidle' })

    // Wait for session
    const logoutBtn = page.getByRole('button', { name: /Salir/i })
    await expect(logoutBtn).toBeVisible({ timeout: 20000 })

    // Click logout
    await logoutBtn.click()

    // Force reload to ensure state sync
    await page.reload({ waitUntil: 'networkidle' })

    // Verify we are back to unauthenticated state
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible({ timeout: 20000 })

    await expect(page.getByRole('button', { name: /Registrarse/i })).toBeVisible({ timeout: 20000 })
  })
})
