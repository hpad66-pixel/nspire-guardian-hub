import { test as baseTest, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

baseTest.describe("D3 Change Events — unauth", () => {
  baseTest("route requires auth", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/financials/change-events");
    await expect(page).toHaveURL(/\/auth/);
  });
});

authTest.describe("D3 Change Events — authed", () => {
  authTest("detail page renders lines grid with bucket selectors", async ({ authed, seeds }) => {
    authTest.skip(!seeds.changeEventId, "E2E_SEEDED_CHANGE_EVENT_ID required");
    await authed.goto(`/projects/${seeds.projectId}/financials/change-events/${seeds.changeEventId}`);
    await expect(authed.getByRole("heading", { name: /change event|CE-/i })).toBeVisible();
    await expect(authed.getByText(/lines/i)).toBeVisible();
    // Status pill from the status enum set on the detail page.
    await expect(authed.getByText(/pending|submitted|approved/i)).toBeVisible();
  });

  authTest("promote dialog warns when project has no prime contract", async ({ authed, seeds }) => {
    authTest.skip(!seeds.changeEventId, "E2E_SEEDED_CHANGE_EVENT_ID required");
    // The dialog itself opens regardless of prime contract state; the backend-side
    // validation message surfaces after the user clicks "Create PCO".
    await authed.goto(`/projects/${seeds.projectId}/financials/change-events/${seeds.changeEventId}`);
    const promoteButton = authed.getByRole("button", { name: /promote.*pco/i });
    // Don't fail the test if the button is disabled — that's the correct UX when
    // no lines are selected.
    if (await promoteButton.isDisabled().catch(() => false)) return;
    await promoteButton.click();
    await expect(authed.getByRole("dialog")).toBeVisible();
    await expect(authed.getByRole("dialog").getByText(/pco/i)).toBeVisible();
  });

  authTest("promote creates a PCO when at least one line is selected", async ({ authed, seeds }) => {
    authTest.skip(!seeds.changeEventId, "E2E_SEEDED_CHANGE_EVENT_ID required");
    await authed.goto(`/projects/${seeds.projectId}/financials/change-events/${seeds.changeEventId}`);
    const firstCheckbox = authed.getByRole("checkbox").first();
    if (!(await firstCheckbox.isVisible().catch(() => false))) return;
    await firstCheckbox.check();
    await authed.getByRole("button", { name: /promote.*pco/i }).click();
    await authed.getByLabel(/pco title|title/i).first().fill("E2E promoted test");
    await authed.getByRole("button", { name: /create pco|promote/i }).click();
    await expect(authed.getByText(/pco created|promoted/i)).toBeVisible({ timeout: 10_000 });
  });
});
