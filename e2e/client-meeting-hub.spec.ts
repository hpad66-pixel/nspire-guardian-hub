import { test, expect, type Page } from '@playwright/test';
import { onRequest } from '../functions/mcp.js';
const client = '97000000-0000-4000-8000-000000000011';
const project = '97000000-0000-4000-8000-000000000021';
const user = '97000000-0000-4000-8000-000000000002';
const source = { id: 'm1', title: 'Portfolio coordination', meeting_date: '2026-09-09', attendees: 'APAS and R4', transcript: 'Private meeting transcript', project_ids: [project], revision: 1, sections: [{ heading: 'Executive summary', text: 'Coordinate closeout records and confirm site access before scheduling the next visit.', basis: 'verified' }] };
const snapshot = { ...source, client_name: 'R4 Capital', actions: [{ id: 'a1', project: 'Sewer extension', title: 'Confirm site access', assignee: 'R4 representative', ball_in_court: 'R4', due_date: null, state: 'open', step: 1 }] };
async function mount(page: Page, staff: boolean) {
    page.on('pageerror', error => console.error('Meeting harness:', error.message));
    let revision = 1;
    const commands: Record<string, any>[] = [];
    await page.route('**/*.supabase.co/**', async (route) => {
        const url = route.request().url();
        let data: unknown = [];
        if (url.includes('client_meeting_bundle'))
            data = { client: { id: client, name: 'R4 Capital' }, canEdit: staff, projects: [{ id: project, name: 'Sewer extension' }], members: [{ id: user, name: 'R4 representative' }], meetings: staff ? [{ ...source, revision }] : [], publications: [{ id: 'pub1', meeting_id: 'm1', revision: 1, published_at: '2026-09-09T12:00:00Z', snapshot }], actions: [{ id: 'a1', meeting_id: 'm1', project_id: project, title: 'Confirm site access', assignee_id: user, assignee_name: 'R4 representative', ball_in_court: 'R4', due_date: null, source_quote: 'Please confirm access.', source_locator: '12:40', revision: 1, published: true, state: 'open', step: 1 }], comments: [], delivery: null, deliveries: [] };
        if (url.includes('client_meeting_command')) {
            const body = route.request().postDataJSON();
            commands.push(body);
            data = { id: 'm1', revision: ++revision };
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
test('client updates are interactive and internal editor stays hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const calls = await mount(page, false);
    await expect(page.getByRole('button', { name: 'Edit entire report', exact: true })).toHaveCount(0);
    await page.getByText('0 updates · Discuss & view evidence', { exact: true }).click();
    await page.getByLabel('Provide an update').fill('Access is arranged for Friday.');
    await page.getByRole('button', { name: 'Post update', exact: true }).click();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].p_operation).toBe('comment');
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
