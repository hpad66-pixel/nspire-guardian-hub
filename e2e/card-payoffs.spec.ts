import { expect, test } from '@playwright/test';

const authFile = process.env.PLAYWRIGHT_AUTH_FILE;

test.describe('American Express card payoff controls', () => {
  test.skip(!authFile, 'Authenticated workspace state is required');

  test('shows connection truth, masked account guidance, and no premature paid state', async ({ page }) => {
    await page.goto('/admin/card-payoffs');
    await expect(page.getByRole('heading', { name: 'American Express Card Payoffs' })).toBeVisible();
    await expect(page.getByText('Direct payment connection is not active yet')).toBeVisible();
    await expect(page.getByText('Only a nickname and last four digits').first()).toBeVisible();
    await expect(page.getByText(/cannot see whether Amex is linked inside your bank/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /direct submission unlocks/i })).toBeDisabled();
  });
});
