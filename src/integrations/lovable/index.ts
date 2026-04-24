/**
 * Deprecated Lovable auth shim.
 *
 * Kept as an empty file to avoid breaking stale git history or lingering
 * imports. All callers have migrated to `supabase.auth.signInWithOAuth({...})`
 * directly against the standalone Supabase project.
 *
 * You can safely delete this file once you've confirmed nothing imports from
 * `@/integrations/lovable` across the whole codebase.
 */
export {};
