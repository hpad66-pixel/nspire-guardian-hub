import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { actionDigest, sha256Hex, signApproval, verifyApproval, type ApprovalClaims } from "./crm-card-security.ts";

Deno.test("signed approvals bind exact actor, scope, and action", async () => {
  const claims: ApprovalClaims = {
    version: 1, approvalId: crypto.randomUUID(), intakeId: crypto.randomUUID(),
    actorUserId: crypto.randomUUID(), tenantId: crypto.randomUUID(), projectId: crypto.randomUUID(),
    normalizedActionSha256: await actionDigest({ kind: "create", reviewedFields: { firstName: "Morgan" } }, { tags: [] }),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const token = await signApproval(claims, "a-secure-test-secret-with-more-than-32-characters");
  assertEquals(await verifyApproval(token, "a-secure-test-secret-with-more-than-32-characters"), claims);
  await assertRejects(() => verifyApproval(`${token.slice(0, -1)}x`, "a-secure-test-secret-with-more-than-32-characters"));
  assertEquals((await sha256Hex(token)).length, 64);
});

Deno.test("expired approvals fail closed", async () => {
  const claims: ApprovalClaims = {
    version: 1, approvalId: crypto.randomUUID(), intakeId: crypto.randomUUID(), actorUserId: crypto.randomUUID(),
    tenantId: crypto.randomUUID(), projectId: crypto.randomUUID(), normalizedActionSha256: "a".repeat(64),
    expiresAt: new Date(Date.now() - 1).toISOString(),
  };
  const token = await signApproval(claims, "a-secure-test-secret-with-more-than-32-characters");
  await assertRejects(() => verifyApproval(token, "a-secure-test-secret-with-more-than-32-characters"));
});
