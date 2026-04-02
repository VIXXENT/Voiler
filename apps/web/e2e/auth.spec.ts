import { expect, test } from '@playwright/test'

test('login page renders with form fields', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /log\s*in|sign\s*in/i })).toBeVisible()
})

test('register page renders with form fields', async ({ page }) => {
  await page.goto('/auth/register')
  await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: /register|sign\s*up/i,
    }),
  ).toBeVisible()
})

test('attempting login with invalid credentials shows error', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com')
  await page.getByLabel(/password/i).fill('wrongpassword123')
  await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click()
  await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible()
})

test('navigation shows Login/Register when not authenticated', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /register/i })).toBeVisible()
})
