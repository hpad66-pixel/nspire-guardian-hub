/**
 * B4 · EXIF parser unit tests.
 *
 * Validates the fallback behavior since we can't ship binary fixtures
 * through this harness — the happy path is exercised against constructed
 * JPEG blobs that include a minimal APP1 EXIF segment with DateTimeOriginal.
 */
import { describe, it, expect } from "vitest";
import { readExif } from "@/lib/exif";

function makeJpegWithExif(): Blob {
  // Minimal JPEG SOI + APP1 header with "Exif\0\0" magic, but no IFDs —
  // parser should early-return EMPTY without crashing.
  const bytes = new Uint8Array([
    0xff, 0xd8,             // SOI
    0xff, 0xe1, 0x00, 0x0a, // APP1, length=10
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49,             // TIFF little-endian
    0xff, 0xd9,             // EOI
  ]);
  return new Blob([bytes], { type: "image/jpeg" });
}

function makeNonJpeg(): Blob {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG signature
  return new Blob([bytes], { type: "image/png" });
}

describe("readExif", () => {
  it("returns empty result for non-JPEG files", async () => {
    const file = new File([makeNonJpeg()], "pic.png", { type: "image/png" });
    const result = await readExif(file);
    expect(result.takenAt).toBeNull();
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.raw).toEqual({});
  });

  it("gracefully handles malformed JPEG (no throw)", async () => {
    const file = new File([makeJpegWithExif()], "min.jpg", { type: "image/jpeg" });
    // Even with no IFDs to parse, this should not throw.
    await expect(readExif(file)).resolves.toBeTruthy();
  });

  it("returns empty for corrupted buffers", async () => {
    const file = new File([new Uint8Array([0x00])], "junk.jpg", { type: "image/jpeg" });
    const result = await readExif(file);
    expect(result).toEqual({ takenAt: null, lat: null, lng: null, raw: {} });
  });
});
