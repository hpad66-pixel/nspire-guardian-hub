import { describe, it, expect } from "vitest";
import { isChunkLoadError } from "../chunkReload";

describe("isChunkLoadError", () => {
  it("matches stale dynamic-import / chunk failures across browsers", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://x/assets/Page-abc.js"))).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk 7 failed."))).toBe(true);
    const named = new Error("boom"); named.name = "ChunkLoadError";
    expect(isChunkLoadError(named)).toBe(true);
    expect(isChunkLoadError("Failed to fetch dynamically imported module")).toBe(true);
  });

  it("matches React.lazy reading `.default` off a stale/undefined chunk", () => {
    // Chrome
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'default')"))).toBe(true);
    // older Chrome / V8
    expect(isChunkLoadError(new TypeError("Cannot read property 'default' of undefined"))).toBe(true);
    // Safari
    expect(isChunkLoadError(new TypeError("undefined is not an object (evaluating 'n.default')"))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    // plain undefined-read (no `.default`) is a real bug, NOT a stale chunk
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'foo')"))).toBe(false);
    expect(isChunkLoadError(new TypeError("x is not a function"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
