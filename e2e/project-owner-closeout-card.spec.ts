import { test, expect } from './fixtures/auth';

test.describe('project ownership and closeout cards', () => {
  test('project intake exposes the accountable owner selector', async ({ authed }) => {
    await authed.goto('/projects');
    const create = authed.getByRole('button', { name: /new project/i });
    if (!(await create.isVisible())) {
      test.skip(true, 'Authenticated fixture cannot create projects.');
      return;
    }
    await create.click();
    await expect(authed.getByLabel('Project Owner')).toBeVisible();
    await expect(authed.getByText('The accountable person displayed on every project card.')).toBeVisible();
  });

  test('project details identify the accountable owner', async ({ authed, seeds }) => {
    await authed.goto(`/projects/${seeds.projectId}`);
    await expect(authed.getByLabel(/project owner:/i).first()).toBeVisible();
  });
});
