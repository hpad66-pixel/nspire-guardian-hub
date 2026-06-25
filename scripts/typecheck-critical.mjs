// Critical typecheck gate.
//
// The plain `tsc --noEmit` against the root tsconfig is a no-op (root tsconfig
// has `files: []` + project references), which is how a missing-import bug
// (`<ClipboardList/>` used but not imported) crashed /daily-reports in prod.
//
// A full strict `tsc -p tsconfig.app.json` currently reports ~265 pre-existing
// errors, the bulk being Supabase select-inference noise from a codebase-wide
// `.from("table" as any)` pattern — type-only, not runtime bugs, and the
// production build is esbuild (no tsc), so they don't break anything.
//
// This gate runs the REAL app typecheck but fails ONLY on the error classes
// that crash the app at runtime: missing imports, undefined names, and
// unresolved modules. That catches the daily-reports class of bug while we
// chip away at the rest separately.
//
// For the full list: `npx tsc -p tsconfig.app.json --noEmit`.
import { execSync } from 'node:child_process';

const CRITICAL = [
  'TS2304', // Cannot find name 'X'            (undefined identifier — e.g. unimported icon)
  'TS2305', // Module 'X' has no exported member 'Y'
  'TS2307', // Cannot find module 'X'
  'TS2552', // Cannot find name 'X'. Did you mean 'Y'?
  'TS2613', // Module 'X' has no default export
  'TS2614', // Module 'X' has no exported member 'Y' (named import on default-only)
  'TS2724', // 'X' has no exported member named 'Y'. Did you mean 'Z'?
];

let out = '';
try {
  out = execSync('npx tsc -p tsconfig.app.json --noEmit', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}

const re = new RegExp(`error (${CRITICAL.join('|')})\\b`);
const hits = out.split('\n').filter((l) => re.test(l));

if (hits.length) {
  console.error('✖ Critical type errors (missing imports / undefined names / unresolved modules):\n');
  console.error(hits.join('\n'));
  console.error(`\n${hits.length} critical error(s). These break the app at runtime — fix before merging.`);
  process.exit(1);
}

console.log('✓ No critical type errors (missing imports / undefined names / unresolved modules).');
