import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CardContractError, assertNoIdentityOverrides, normalizeEmail, normalizeName,
  normalizePhone, normalizeWebsite, parseAction, parseCreateIntake,
} from "./crm-card-contract.ts";

Deno.test("normalizes contact match keys", () => {
  assertEquals(normalizeEmail("  PAT@Example.COM "), "pat@example.com");
  assertEquals(normalizePhone("(305) 555-1212"), "+13055551212");
  assertEquals(normalizePhone("+44 20 7946 0958"), "+442079460958");
  assertEquals(normalizeWebsite("Example.COM/Team"), "https://example.com/team");
  assertEquals(normalizeName(" José  O'Neil "), "jose o neil");
});

Deno.test("rejects nested caller identity overrides", () => {
  const error = assertThrows(() => assertNoIdentityOverrides({ safe: { tenant_id: crypto.randomUUID() } }));
  assertEquals((error as CardContractError).code, "SCOPE_OVERRIDE_REJECTED");
});

Deno.test("card intake accepts only server-derivable scope", () => {
  const body = {
    operation: "create_intake", contractVersion: "2026-09-01",
    projectId: crypto.randomUUID(), correlationId: crypto.randomUUID(), idempotencyKey: "synthetic-intake-0001",
    card: { mediaType: "image/png", frontSha256: "a".repeat(64) },
    sourceContext: { tags: ["conference"] },
  };
  assertEquals(parseCreateIntake(body).card.mediaType, "image/png");
  assertThrows(() => parseCreateIntake({ ...body, userId: crypto.randomUUID() }));
  assertThrows(() => parseCreateIntake({ ...body, sourceContext: { tags: [], projectId: crypto.randomUUID() } }));
});

Deno.test("CRM actions reject scope and inconsistent targets", () => {
  assertThrows(() => parseAction({ kind: "create", targetContactId: crypto.randomUUID(), reviewedFields: { firstName: "Pat" } }));
  assertThrows(() => parseAction({ kind: "update", reviewedFields: { firstName: "Pat" } }));
  assertThrows(() => parseAction({ kind: "create", reviewedFields: { firstName: "Pat", user_id: crypto.randomUUID() } }));
  assertThrows(() => parseAction({ kind: "create", reviewedFields: { firstName: "Pat", email: "not-email" } }));
});
