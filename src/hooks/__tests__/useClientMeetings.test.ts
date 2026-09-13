import { describe, it, expect, vi, beforeEach } from 'vitest';
import { meetingRpc } from '../useClientMeetings';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { meetingReportHtml, meetingScheduleDue, parseMeetingDraft, type MeetingSnapshot } from '../../../supabase/functions/_shared/clientMeetingReport';
const snapshot: MeetingSnapshot = { title: 'Weekly review', meeting_date: '2026-09-09', client_name: 'R4', attendees: 'Client and APAS', project_ids: ['p1'], sections: [{ heading: 'Progress', text: 'Documents reviewed.', basis: 'verified' }], actions: [] };
describe('Client meeting report contract', () => {
    it('renders standalone dated HTML with portal call to action', () => { const html = meetingReportHtml(snapshot, 'https://projos.ai/owner-portal/clients/c1/meetings'); expect(html).toContain('APAS CONSULTING'); expect(html).toContain('2026-09-09'); expect(html).toContain('Open Meetings &amp; Actions'); });
    it('escapes user text instead of executing report markup', () => { const html = meetingReportHtml({ ...snapshot, title: '<script>bad()</script>' }, 'https://projos.ai', '<img onerror="bad()">'); expect(html).not.toContain('<script>'); expect(html).not.toContain('<img '); expect(html).toContain('&lt;script&gt;'); });
    it('requires human review even when AI claims verified facts', () => { const draft = parseMeetingDraft(JSON.stringify({ title: 'Meeting', sections: [{ heading: 'Progress', text: 'Done', basis: 'verified' }], actions: [] }), ['p1'], 'Transcript'); expect(draft.sections[0].basis).toBe('needs_review'); });
    it('rejects fabricated project mapping, quote and due date', () => { const draft = parseMeetingDraft(JSON.stringify({ title: 'Meeting', sections: [], actions: [{ title: 'Review', project_id: 'other-client', source_quote: 'fabricated', due_date: '2030-01-01' }] }), ['p1'], 'Actual transcript'); expect(draft.actions[0]).toMatchObject({ project_id: '', source_quote: '', due_date: '' }); });
    it('retains exact transcript evidence', () => { const draft = parseMeetingDraft(JSON.stringify({ title: 'Meeting', sections: [], actions: [{ title: 'Review', project_id: 'p1', source_quote: 'I will check access' }] }), ['p1'], 'Chris: I will check access tomorrow.'); expect(draft.actions[0].source_quote).toBe('I will check access'); });
    it('rejects malformed AI without accepting an incomplete draft', () => expect(() => parseMeetingDraft('{}', [], '')).toThrow());
    it('uses selected local hour and weekday through daylight savings', () => { const schedule = { weekday: 5, hour: 9, timezone: 'America/New_York' }; expect(meetingScheduleDue(schedule, new Date('2026-09-11T13:10:00Z'))).toBe(true); expect(meetingScheduleDue(schedule, new Date('2026-12-11T14:10:00Z'))).toBe(true); expect(meetingScheduleDue(schedule, new Date('2026-09-11T14:10:00Z'))).toBe(false); });
});

describe('Meeting RPC boundary', () => {
    beforeEach(() => rpc.mockReset());
    it('returns the authorized client bundle', async () => {
        rpc.mockResolvedValue({data:{canEdit:true,meetings:[]},error:null});
        await expect(meetingRpc('client_meeting_bundle',{p_client_id:'client-a'})).resolves.toEqual({canEdit:true,meetings:[]});
        expect(rpc).toHaveBeenCalledWith('client_meeting_bundle',{p_client_id:'client-a'});
    });
    it('propagates permission denial instead of rendering empty success', async () => {
        rpc.mockResolvedValue({data:null,error:new Error('Client meeting access denied')});
        await expect(meetingRpc('client_meeting_bundle',{p_client_id:'other-client'})).rejects.toThrow('access denied');
    });
    it('preserves revision conflicts for the editor to resolve', async () => {
        rpc.mockResolvedValue({data:null,error:new Error('This meeting changed. Reload before saving your edits.')});
        await expect(meetingRpc('client_meeting_command',{p_operation:'save',p_payload:{revision:1}})).rejects.toThrow('Reload before saving');
    });
});
