import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rollup = JSON.parse(readFileSync(new URL('../docs/governance/standards-rollup.json', import.meta.url), 'utf8'));

test('ProjOS governance rollup preserves identity, approval and audit authority', () => {
  assert.equal(rollup.schema, 'apas.governance-dashboard-rollup/1');
  assert.equal(rollup.consumerId, 'projos');
  assert.equal(rollup.certificationStatus, 'not-certified-dashboard-evidence-only');
  assert.match(rollup.sourceTruthBoundary, /ProjOS owns workflow state/);
  assert.ok(rollup.blockedClaims.includes('CRM context is live security authority'));
  assert.ok(rollup.blockedClaims.includes('ontology approves workflow decisions'));
});

test('ProjOS governance rollup includes AI, security, semantic and federal lanes', () => {
  assert.ok(rollup.lanes.find((lane) => lane.key === 'security-governance').evidenceRequired.includes('identity authority'));
  assert.ok(rollup.lanes.find((lane) => lane.key === 'ai-governance').standardFamily.includes('ISO/IEC 42001'));
  assert.ok(rollup.lanes.find((lane) => lane.key === 'semantic-web').standardFamily.includes('W3C'));
  assert.ok(rollup.lanes.find((lane) => lane.key === 'federal-omb-readiness'));
});
