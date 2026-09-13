import { describe, expect, it } from 'vitest';
import { noticeChecks, noticeLetter, type NoticeDraft } from '../../../supabase/functions/_shared/noticeToProceed';

const draft:NoticeDraft={agreement_reference:'Signed agreement 100',agreement_approved_on:'2026-01-01',agreement_confirmed:true,scope_of_work:'Inspect and report.',start_date:'2026-10-01',completion_date:'2026-10-31',budget_cents:1200050,prerequisites_confirmed:true,instructions:'Coordinate access.',recipient_email:'vendor@example.com',cc_emails:[],bcc_emails:['private@example.com']};
describe('Notice to Proceed release checks and letter',()=>{
  it('requires onboarding and explicit agreement approval independently',()=>{
    expect(noticeChecks(draft,true).every(c=>c.ready)).toBe(true);
    expect(noticeChecks(draft,false)[0].ready).toBe(false);
    expect(noticeChecks({...draft,agreement_confirmed:false},true)[1].ready).toBe(false);
  });
  it('rejects missing amounts, invalid dates, and fractional cents',()=>{
    expect(noticeChecks({...draft,budget_cents:null},true)[4].ready).toBe(false);
    expect(noticeChecks({...draft,budget_cents:1.5},true)[4].ready).toBe(false);
    expect(noticeChecks({...draft,completion_date:'2026-09-01'},true)[3].ready).toBe(false);
  });
  it('escapes company input and excludes internal BCC recipients',()=>{
    const html=noticeLetter({...draft,id:'12345678',case_id:'1',status:'issued',issued_at:'2026-09-12',scope_of_work:'<img src=x onerror=alert(1)>',snapshot:{company_name:'A & B',project_name:'Test',branding:{company_name:'APAS Consulting'}}});
    expect(html).toContain('A &amp; B'); expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img'); expect(html).not.toContain('private@example.com');
    expect(html).toContain('$12,000.50'); expect(html).not.toContain('—');
  });
});
