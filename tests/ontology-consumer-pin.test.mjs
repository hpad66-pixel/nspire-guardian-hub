import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pin = JSON.parse(readFileSync(new URL('../docs/ontology/consumer-pin.json', import.meta.url), 'utf8'));

test('ProjOS pins ontology while retaining workflow and audit authority', () => {
  assert.equal(pin.contractVersion, 'apas.ontology-consumer-pin/1');
  assert.equal(pin.consumerId, 'projos');
  assert.equal(pin.ontologyRelease.repository, 'https://github.com/APAS-ai/Ontology.git');
  assert.equal(pin.ontologyRelease.semanticApproval, false);
  assert.equal(pin.authorityBoundary.projosOwnsWorkflowState, true);
  assert.equal(pin.authorityBoundary.projosOwnsApprovalsAndAudit, true);
  assert.equal(pin.authorityBoundary.ontologyOwnsSharedMeaning, true);
});

test('ProjOS ontology gate blocks silent authority transfer', () => {
  assert.ok(pin.blockedUses.includes('automatic ontology replacement'));
  assert.ok(pin.blockedUses.includes('delegating workflow authority to ontology'));
  assert.ok(pin.upgradeGate.requiredChecks.includes('workflow state authority remains in ProjOS'));
  assert.ok(pin.upgradeGate.requiredChecks.includes('rollback path keeps the prior ontology mapping available'));
});
