#!/usr/bin/env node
/**
 * Converts an export of existing Supabase auth users into Auth0's bulk-import
 * format, preserving bcrypt password hashes so migrated users keep the password
 * they already have.
 *
 * Why an input file rather than a direct connection: `encrypted_password` lives
 * in `auth.users` and is not exposed by the Supabase admin API, so the export
 * has to come from SQL. Keeping that step manual means this script never needs
 * database credentials, and the operator sees exactly what leaves the database.
 *
 * 1. Run this in the Supabase SQL editor (or psql) and save the result as JSON:
 *
 *      SELECT json_agg(row_to_json(u)) FROM (
 *        SELECT u.id,
 *               u.email,
 *               u.encrypted_password,
 *               u.email_confirmed_at,
 *               p.full_name
 *        FROM auth.users u
 *        LEFT JOIN public.profiles p ON p.user_id = u.id
 *        WHERE u.deleted_at IS NULL
 *          AND u.email IS NOT NULL
 *          AND COALESCE(u.is_anonymous, false) = false
 *      ) u;
 *
 * 2. node scripts/auth0-bulk-import.mjs --input supabase-users.json \
 *      --out auth0-users.json --product projos
 *
 * 3. Auth0 Dashboard → User Management → Import Users, or the Management API
 *    POST /api/v2/jobs/users-imports with the target database connection.
 *
 * The exported file contains password hashes. Delete it once the import job
 * reports success.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const inputPath = flag('input');
const outputPath = flag('out', 'auth0-users.json');
const product = flag('product', 'projos');

if (!inputPath) {
  console.error('Usage: node scripts/auth0-bulk-import.mjs --input <supabase-users.json> [--out auth0-users.json] [--product projos]');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
// Accept either the bare array or the single-column json_agg wrapper.
const rows = Array.isArray(raw)
  ? raw
  : Array.isArray(raw?.json_agg)
    ? raw.json_agg
    : Array.isArray(raw?.[0]?.json_agg)
      ? raw[0].json_agg
      : null;

if (!rows) {
  console.error('Could not find a user array in the input file.');
  process.exit(1);
}

const skipped = [];

const users = rows.flatMap((row) => {
  const email = String(row.email ?? '').trim().toLowerCase();
  if (!email) {
    skipped.push({ id: row.id, reason: 'no email' });
    return [];
  }

  const hash = String(row.encrypted_password ?? '').trim();
  // Supabase writes bcrypt ($2a/$2b/$2y). Anything else — an SSO-only account,
  // or a user who has never set a password — imports without one; Auth0 will
  // ask them to reset on first login.
  const isBcrypt = /^\$2[aby]\$/.test(hash);
  if (hash && !isBcrypt) skipped.push({ id: row.id, reason: 'unsupported password hash' });

  const user = {
    email,
    email_verified: Boolean(row.email_confirmed_at),
    app_metadata: {
      // Backfilled attribution: these accounts predate Auth0, and they all came
      // from this product.
      signup_product: product,
      products: [product],
      migrated_from: 'supabase',
      supabase_user_id: row.id,
    },
  };

  if (row.full_name) user.name = String(row.full_name);
  if (isBcrypt) {
    user.custom_password_hash = { algorithm: 'bcrypt', hash: { value: hash } };
  }

  return [user];
});

writeFileSync(outputPath, JSON.stringify(users, null, 2));

console.log(`Wrote ${users.length} users to ${outputPath}`);
console.log(`  with password hash: ${users.filter((u) => u.custom_password_hash).length}`);
console.log(`  password reset required: ${users.filter((u) => !u.custom_password_hash).length}`);
if (skipped.length > 0) {
  console.log(`Skipped or downgraded ${skipped.length} row(s):`);
  for (const entry of skipped.slice(0, 20)) console.log(`  ${entry.id}: ${entry.reason}`);
}
console.log('\nThis file contains password hashes. Delete it once the import job succeeds.');
