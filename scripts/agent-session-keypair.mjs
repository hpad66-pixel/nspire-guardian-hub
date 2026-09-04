/**
 * Generates an ES256 key pair for the Proj OS Agent session boundary.
 * Private material is written only to an explicit directory with mode 0600
 * and is never printed. Do not generate production keys inside a repository.
 */
import { createHash, randomBytes, webcrypto } from "node:crypto";
import { mkdir, open, rm } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function generateAgentSessionKeyPair({ outputDir, keyId = defaultKeyId() }) {
  if (!outputDir || !isAbsolute(outputDir)) throw new Error("--output-dir must be an explicit absolute path outside the repository.");
  if (!/^proj-os-agent-[a-z0-9][a-z0-9._-]{5,80}$/i.test(keyId)) {
    throw new Error("--key-id must start with proj-os-agent- and contain only safe identifier characters.");
  }

  const repositoryRoot = resolve(new URL("..", import.meta.url).pathname);
  const target = resolve(outputDir);
  if (target === repositoryRoot || target.startsWith(`${repositoryRoot}/`)) {
    throw new Error("Refusing to write signing keys inside the repository.");
  }

  await mkdir(target, { recursive: true, mode: 0o700 });
  const privatePath = join(target, "agent-session-private.jwk");
  const publicPath = join(target, "agent-session-public.jwk");
  const jwksPath = join(target, "agent-session-public.jwks");
  const metadataPath = join(target, "agent-session-key.json");
  const reservations = [];
  const createdPaths = [];
  try {
    for (const [path, mode] of [[privatePath, 0o600], [publicPath, 0o644], [jwksPath, 0o644], [metadataPath, 0o644]]) {
      reservations.push(await open(path, "wx", mode));
      createdPaths.push(path);
    }

    const pair = await webcrypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const privateJwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
    const publicJwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
    const privateValue = { ...privateJwk, alg: "ES256", use: "sig", kid: keyId };
    const publicValue = { ...publicJwk, alg: "ES256", use: "sig", kid: keyId };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ crv: publicValue.crv, kty: publicValue.kty, x: publicValue.x, y: publicValue.y }))
      .digest("hex");

    await reservations[0].writeFile(`${JSON.stringify(privateValue)}\n`, { encoding: "utf8" });
    await reservations[1].writeFile(`${JSON.stringify(publicValue)}\n`, { encoding: "utf8" });
    await reservations[2].writeFile(`${JSON.stringify({ keys: [publicValue] })}\n`, { encoding: "utf8" });
    await reservations[3].writeFile(`${JSON.stringify({
      keyId,
      algorithm: "ES256",
      curve: "P-256",
      publicKeySha256: fingerprint,
      createdAt: new Date().toISOString(),
      privateKeyPath: privatePath,
      publicKeyPath: publicPath,
      publicJwksPath: jwksPath,
    }, null, 2)}\n`, { encoding: "utf8" });

    return { keyId, fingerprint, privatePath, publicPath, jwksPath, metadataPath };
  } catch (error) {
    await Promise.all(reservations.map((handle) => handle.close()));
    reservations.length = 0;
    await Promise.all(createdPaths.map((path) => rm(path, { force: true })));
    throw error;
  } finally {
    await Promise.all(reservations.map((handle) => handle.close()));
  }
}

function defaultKeyId() {
  const month = new Date().toISOString().slice(0, 7);
  return `proj-os-agent-${month}-${randomBytes(4).toString("hex")}`;
}

function parseArguments(argv) {
  const value = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output-dir") value.outputDir = argv[++index];
    else if (argv[index] === "--key-id") value.keyId = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await generateAgentSessionKeyPair(parseArguments(process.argv.slice(2)));
    console.log(`Generated ${result.keyId}`);
    console.log(`Public-key SHA-256: ${result.fingerprint}`);
    console.log(`Private JWK (0600): ${result.privatePath}`);
    console.log(`Public JWK: ${result.publicPath}`);
    console.log(`Public JWKS: ${result.jwksPath}`);
    console.log("The private JWK was not printed. Move it directly into the Proj OS secret manager.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Key generation failed.");
    process.exitCode = 1;
  }
}
