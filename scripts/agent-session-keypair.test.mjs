import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { generateAgentSessionKeyPair } from "./agent-session-keypair.mjs";

const directories = [];
after(async () => Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true }))));

test("writes a matched P-256 pair without exposing private material in metadata", async () => {
  const parent = await mkdtemp(join(tmpdir(), "proj-os-agent-keys-"));
  directories.push(parent);
  const outputDir = join(parent, "staging-key");
  const result = await generateAgentSessionKeyPair({ outputDir, keyId: "proj-os-agent-staging-test" });
  const privateJwk = JSON.parse(await readFile(result.privatePath, "utf8"));
  const publicJwk = JSON.parse(await readFile(result.publicPath, "utf8"));
  const publicJwks = JSON.parse(await readFile(result.jwksPath, "utf8"));
  const metadata = JSON.parse(await readFile(result.metadataPath, "utf8"));

  assert.equal(privateJwk.kty, "EC");
  assert.equal(privateJwk.crv, "P-256");
  assert.equal(typeof privateJwk.d, "string");
  assert.equal(publicJwk.d, undefined);
  assert.equal(publicJwk.x, privateJwk.x);
  assert.equal(publicJwk.y, privateJwk.y);
  assert.deepEqual(publicJwks, { keys: [publicJwk] });
  assert.equal(metadata.privateJwk, undefined);
  assert.match(metadata.publicKeySha256, /^[a-f0-9]{64}$/);
  assert.equal((await stat(result.privatePath)).mode & 0o777, 0o600);
});

test("refuses to overwrite an existing key pair", async () => {
  const parent = await mkdtemp(join(tmpdir(), "proj-os-agent-keys-"));
  directories.push(parent);
  const outputDir = join(parent, "staging-key");
  await generateAgentSessionKeyPair({ outputDir, keyId: "proj-os-agent-staging-first" });
  await assert.rejects(
    generateAgentSessionKeyPair({ outputDir, keyId: "proj-os-agent-staging-second" }),
    /exist/i,
  );
});
