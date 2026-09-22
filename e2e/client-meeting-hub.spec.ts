import { test, expect, type Page } from '@playwright/test';
import { onRequest } from '../functions/mcp.js';
const client = '97000000-0000-4000-8000-000000000011';
const project = '97000000-0000-4000-8000-000000000021';
const user = '97000000-0000-4000-8000-000000000002';
type CapturedCall = { p_operation?: string; p_id?: string; p_payload?: Record<string, unknown> };
const source = { id: 'm1', title: 'Portfolio coordination', meeting_date: '2026-09-09', attendees: 'APAS and R4', transcript: 'Private meeting transcript', project_ids: [project], revision: 1, sections: [{ heading: 'Executive summary', text: 'Coordinate closeout records and confirm site access before scheduling the next visit.', basis: 'verified' }] };
const snapshot = { ...source, client_name: 'R4 Capital', actions: [{ id: 'a1', project: 'Sewer extension', title: 'Confirm site access', assignee: 'R4 representative', ball_in_court: 'R4', due_date: null, state: 'open', step: 1 }] };
async function mount(page: Page, staff: boolean) {
    page.on('pageerror', error => console.error('Meeting harness:', error.message));
    let revision = 1;
    const commands: CapturedCall[] = [];
    await page.route('**/*.supabase.co/**', async (route) => {
        const url = route.request().url();
        let data: unknown = [];
        if (url.includes('client_meeting_manage_bundle'))
            data = { sources: [], emails: [{ id: 'email1', report_id: 'pub1', subject: 'R4 weekly coordination', recipients: ['owner@example.com'], sent_at: '2026-09-09T13:00:00Z', status: 'sent' }], archivedMeetings: [], archivedSources: [], dismissedEmails: [] };
        if (url.includes('client_meeting_bundle'))
            data = { client: { id: client, name: 'R4 Capital' }, canEdit: staff, canAddInternalUpdates: staff, viewerKind: staff ? 'administrator' : 'client', projects: [{ id: project, name: 'Sewer extension' }], members: [{ id: user, name: 'R4 representative' }], meetings: staff ? [{ ...source, revision }] : [], publications: [{ id: 'pub1', meeting_id: 'm1', revision: 1, published_at: '2026-09-09T12:00:00Z', snapshot }], actions: [{ id: 'a1', meeting_id: 'm1', project_id: project, title: 'Confirm site access', assignee_id: user, assignee_name: 'R4 representative', ball_in_court: 'R4', due_date: null, source_quote: 'Please confirm access.', source_locator: '12:40', revision: 1, published: true, state: 'open', step: 1 }], comments: staff ? [{ id: 'c1', action_id: 'a1', author_name: 'APAS', body: 'Internal negotiation note', audience: 'internal', created_at: '2026-09-09T14:00:00Z' }, { id: 'c2', action_id: 'a1', author_name: 'APAS', body: 'Access coordination is underway.', audience: 'client', created_at: '2026-09-09T15:00:00Z' }] : [{ id: 'c2', action_id: 'a1', author_name: 'APAS', body: 'Access coordination is underway.', audience: 'client', created_at: '2026-09-09T15:00:00Z' }], delivery: null, deliveries: [] };
        if (url.includes('client_meeting_command')) {
            const body = route.request().postDataJSON();
            commands.push(body as CapturedCall);
            data = { id: 'm1', revision: ++revision };
        }
        if (url.includes('client_meeting_add_update')) {
            const body = route.request().postDataJSON();
            commands.push({ p_operation: 'add_update', p_payload: body });
            data = { id: 'a1' };
        }
        if (url.includes('client_meeting_bulk_actions')) {
            const body = route.request().postDataJSON();
            commands.push({ p_operation: 'bulk_actions', p_payload: body });
            data = { ids: ['a2'], count: 1 };
        }
        if (url.includes('client_meeting_manage_command')) {
            commands.push(route.request().postDataJSON() as CapturedCall);
            data = null;
        }
        if (url.includes('/functions/v1/notion')) {
            const body = route.request().postDataJSON();
            if (body.action !== 'status')
                commands.push({ p_operation: `notion_${body.action}` });
            data = body.action === 'status'
                ? { connected: false, connection: null, mappings: [] }
                : { meetingId: 'm1', syncRunId: 'sync1' };
        }
        if (url.includes('/auth/v1/user'))
            data = { id: user, email: 'owner@example.com' };
        await route.fulfill({ json: data });
    });
    await page.route('**/__meeting-test?*', route => route.fulfill({ contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>
 window.__APP_CONFIG__={supabaseUrl:'https://meetingstest.supabase.co',supabasePublishableKey:'test-key'};
 localStorage.setItem('sb-meetingstest-auth-token',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'${user}',email:'owner@example.com'}}));
 </script><script type="module">
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 </script><script type="module" src="/e2e/fixtures/client-meeting-harness.tsx"></script></body></html>` }));
    await page.goto(`/__meeting-test?staff=${staff}`);
    await expect(page.getByTestId('client-meeting-hub')).toBeVisible();
    return commands;
}
test('staff edits the whole narrative and saves with revision protection', async ({ page }) => {
    const calls = await mount(page, true);
    await page.getByRole('button', { name: 'Edit entire report', exact: true }).click();
    await page.getByLabel('Report title', { exact: true }).fill('Updated portfolio review');
    await page.getByLabel('Narrative', { exact: true }).fill('Updated by the administrator on screen.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].p_payload).toMatchObject({ title: 'Updated portfolio review', revision: 1, sections: [{ heading: 'Executive summary', text: 'Updated by the administrator on screen.', basis: 'verified' }] });
    await page.screenshot({ path: test.info().outputPath('meeting-editor.png'), fullPage: true });
});
test('staff sees the Notion source path and removes journal records safely', async ({ page }) => {
    const calls = await mount(page, true);
    await page.getByRole('button', { name: 'Edit entire report', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Meetings come from Notion' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync from Notion', exact: true })).toBeVisible();
    page.once('dialog', dialog => void dialog.accept());
    await page.getByLabel('Delete email R4 weekly coordination').click();
    await expect.poll(() => calls.some(call => call.p_operation === 'dismiss_email' && call.p_id === 'email1')).toBe(true);
    page.once('dialog', dialog => void dialog.accept());
    await page.getByLabel('Delete meeting Portfolio coordination').click();
    await expect.poll(() => calls.some(call => call.p_operation === 'archive_meeting' && call.p_id === 'm1')).toBe(true);
});
test('staff understands the Notion-first project-by-project drafting boundary', async ({ page }) => {
    await mount(page, true);
    await page.getByRole('button', { name: 'Edit entire report', exact: true }).click();
    await expect(page.getByText('Capture in Notion.')).toBeVisible();
    await expect(page.getByText('Sync into Proj OS.')).toBeVisible();
    await expect(page.getByText('Review and release.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Draft from Notion source', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add action manually', exact: true })).toBeVisible();
});
test('staff can still add and assign manual actions from the reviewed record', async ({ page }) => {
    const calls = await mount(page, true);
    await page.getByRole('button', { name: 'Edit entire report', exact: true }).click();
    await page.getByRole('button', { name: 'Add action manually', exact: true }).click();
    await page.getByLabel('Action', { exact: true }).fill('Confirm site access');
    await page.locator('select[name="project_id"]').selectOption(project);
    await page.getByLabel('Assigned portal/account user').selectOption(user);
    await page.getByRole('button', { name: 'Save action', exact: true }).click();
    await expect.poll(() => calls.some(call => call.p_operation === 'action')).toBe(true);
    const call = calls.find(item => item.p_operation === 'action');
    expect(call?.p_payload).toMatchObject({ meeting_id: 'm1', assignee_id: user, title: 'Confirm site access' });
});
test('client updates are interactive and internal editor stays hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const calls = await mount(page, false);
    await expect(page.getByRole('button', { name: 'Edit entire report', exact: true })).toHaveCount(0);
    await page.getByText('1 updates · Discuss & view evidence', { exact: true }).click();
    await page.getByLabel('Add an update for the client').fill('Access is arranged for Friday.');
    await page.getByRole('button', { name: 'Publish client update', exact: true }).click();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].p_operation).toBe('add_update');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: test.info().outputPath('meeting-client-mobile.png'), fullPage: true });
});
test('published report downloads a real PDF without emailing', async ({ page }) => {
    const calls = await mount(page, true);
    await page.getByRole('button', { name: 'Dated report', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await downloadPromise;
    await download.saveAs(test.info().outputPath('meeting-report.pdf'));
    expect(calls).toHaveLength(0);
    await page.screenshot({ path: test.info().outputPath('meeting-report.png'), fullPage: true });
});
test('staff can edit an existing action without losing its project', async ({ page }) => {
    const calls = await mount(page, true);
    await page.getByRole('button', { name: 'Edit action', exact: true }).click();
    await page.getByLabel('Action', { exact: true }).fill('Confirm revised site access');
    await page.getByRole('button', { name: 'Save action', exact: true }).click();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0]).toMatchObject({ p_operation: 'action', p_payload: { id: 'a1', project_id: project, revision: 1, title: 'Confirm revised site access' } });
});
test('staff sees color-coded ownership and compiles selected client-safe actions', async ({ page }) => {
    await mount(page, true);
    await expect(page.getByLabel('Action owner: R4 representative')).toBeVisible();
    await page.getByLabel('Include Confirm site access in client report').check();
    await page.getByRole('button', { name: 'Compile update (1)', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Compile selected action update' })).toBeVisible();
    const reportDialog = page.getByRole('dialog').filter({ hasText: 'Compile selected action update' });
    await expect(reportDialog.getByText(/Latest update: Access coordination is underway/)).toBeVisible();
    await expect(reportDialog.getByText('Internal negotiation note')).toHaveCount(0);
    await page.getByRole('button', { name: 'Request update', exact: true }).click();
    await expect(page.getByText('Please review the selected action items and provide the requested status, decision, or supporting information in the secure client portal.')).toBeVisible();
});
test('MCP exposes scoped meeting tools and refuses publishing', async () => {
    const request = (method: string, params = {}) => new Request('https://projos.ai/mcp', { method: 'POST', headers: { authorization: 'Bearer test-secret', 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    const env = { PROJ_OS_MCP_SHARED_SECRET: 'test-secret' };
    const list = await (await onRequest({ request: request('tools/list'), env })).json();
    expect(list.result.tools.map((t: {
        name: string;
    }) => t.name)).toContain('proj_os_get_client_meetings');
    const attempt = await (await onRequest({ request: request('tools/call', { name: 'proj_os_edit_client_meeting', arguments: { client_id: client, operation: 'publish', payload: {} } }), env })).json();
    expect(attempt.result.isError).toBe(true);
});
