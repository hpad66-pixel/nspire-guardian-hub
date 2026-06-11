/**
 * WS-5 · #5 regression guard — current_tenant_id() must not recurse.
 *
 * get_my_workspace_id() calls current_tenant_id() as its first COALESCE
 * branch. If current_tenant_id() ever calls get_my_workspace_id() back,
 * a claimless user (no JWT 'tenant_id') recurses forever →
 * "stack depth limit exceeded" on ~136 RLS clauses. The fix inlines the
 * profiles read. This static test fails the build if anyone reintroduces
 * the cross-call, since the unit suite mocks Supabase and can't catch the
 * runtime recursion (the pgTAP test below does, against real Postgres).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION =
  "supabase/migrations/20260611123000_ws5_current_tenant_id_fallback.sql";

function currentTenantIdBody(sql: string): string {
  // Body between the function's `AS $$` … `$$;`
  const m = sql.match(/FUNCTION public\.current_tenant_id[\s\S]*?AS \$\$([\s\S]*?)\$\$;/);
  if (!m) throw new Error("current_tenant_id() definition not found in migration");
  return m[1];
}

describe("current_tenant_id() migration body", () => {
  const sql = readFileSync(resolve(process.cwd(), MIGRATION), "utf8");
  const body = currentTenantIdBody(sql);

  it("does NOT call get_my_workspace_id() (would form a recursion cycle)", () => {
    expect(body).not.toMatch(/get_my_workspace_id/);
  });

  it("inlines the profiles.workspace_id fallback for claimless users", () => {
    expect(body).toMatch(/public\.profiles/);
    expect(body).toMatch(/workspace_id/);
    expect(body).toMatch(/auth\.jwt\(\)\s*->>\s*'tenant_id'/);
  });
});
