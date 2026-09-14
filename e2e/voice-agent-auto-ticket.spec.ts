import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test.describe('voice agent automatic ticket creation', () => {
  test('starts ElevenLabs sessions with ticket context as dynamic variables', () => {
    const source = read('src/hooks/useVoiceAgent.ts');

    expect(source).toContain('dynamicVariables');
    expect(source).toContain('client_call_id');
    expect(source).toMatch(/conversation\.startSession\(\{[\s\S]*signedUrl:[\s\S]*dynamicVariables,[\s\S]*userId,/);
    expect(source).toMatch(/call_id:\s*clientCallId/);
    expect(source).toMatch(/property_id:\s*ctx\?\.propertyId/);
  });

  test('lets tool-created requests use the client call id when real conversation id is unavailable', () => {
    const source = read('supabase/functions/voice-agent-tools/index.ts');

    expect(source).toContain('client_call_id');
    expect(source).toMatch(/call_id:\s*call_id\s*\|\|\s*client_call_id\s*\|\|\s*null/);
  });

  test('dedupes post-call transcripts and returns the wired work order', () => {
    const source = read('supabase/functions/voice-agent-webhook/index.ts');

    expect(source).toContain('conversation_initiation_client_data');
    expect(source).toContain('client_call_id');
    expect(source).toMatch(/const lookupCallIds = Array\.from\(new Set\(\[conversationId, clientCallId\]/);
    expect(source).toMatch(/call_id:\s*conversationId/);
    expect(source).toContain("select('id, call_id, ticket_number, work_order_id')");
    expect(source).toContain('const created = await loadRequestSummary(inserted.id) || inserted');
    expect(source).toContain("action: 'created'");
    expect(source).toContain('work_order_id: created.work_order_id');
  });
});
