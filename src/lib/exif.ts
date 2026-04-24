/**
 * B4 · Minimal EXIF extractor — reads JPEG APP1 EXIF segment to pull out
 * DateTimeOriginal + GPS coordinates without a third-party library.
 *
 * Only handles the tags we care about for the Photos module:
 *   - 0x9003 DateTimeOriginal (string)
 *   - 0x8825 GPSInfo (subIFD — we parse Latitude/Longitude + refs)
 *
 * Returns an empty object for non-JPEG files or files without EXIF. All errors
 * are swallowed — callers still upload the file regardless.
 */
export interface ExifResult {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
  raw: Record<string, unknown>;
}

const EMPTY: ExifResult = { takenAt: null, lat: null, lng: null, raw: {} };

export async function readExif(file: File): Promise<ExifResult> {
  try {
    if (!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return EMPTY;
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);

    if (view.getUint16(0) !== 0xffd8) return EMPTY; // not a JPEG

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        // APP1 — check "Exif\0\0"
        const segLen = view.getUint16(offset + 2);
        if (
          view.getUint32(offset + 4) === 0x45786966 &&
          view.getUint16(offset + 8) === 0x0000
        ) {
          return parseTiff(view, offset + 10, segLen - 8);
        }
        offset += 2 + segLen;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        const segLen = view.getUint16(offset + 2);
        offset += 2 + segLen;
      }
    }
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

function parseTiff(view: DataView, tiffStart: number, _len: number): ExifResult {
  const byteOrder = view.getUint16(tiffStart);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return EMPTY;

  const firstIfd = tiffStart + view.getUint32(tiffStart + 4, little);
  const ifd0 = readIfd(view, firstIfd, tiffStart, little);

  let takenAt: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  // Walk IFD0 → ExifIFD (0x8769) and GPSIFD (0x8825)
  const exifIfdOffset = ifd0[0x8769] as number | undefined;
  const gpsIfdOffset = ifd0[0x8825] as number | undefined;

  if (exifIfdOffset !== undefined) {
    const exif = readIfd(view, tiffStart + exifIfdOffset, tiffStart, little);
    // 0x9003 DateTimeOriginal (ASCII like "2025:04:21 10:33:15")
    const dto = exif[0x9003] as string | undefined;
    if (dto) {
      const [d, t] = dto.split(" ");
      const isoDate = d?.replace(/:/g, "-") ?? "";
      if (isoDate && t) takenAt = `${isoDate}T${t}Z`;
    }
  }

  if (gpsIfdOffset !== undefined) {
    const gps = readIfd(view, tiffStart + gpsIfdOffset, tiffStart, little);
    const latRef = gps[0x0001] as string | undefined;
    const latVal = gps[0x0002] as number[] | undefined;
    const lngRef = gps[0x0003] as string | undefined;
    const lngVal = gps[0x0004] as number[] | undefined;
    if (latVal && latVal.length === 3) {
      lat = dmsToDeg(latVal) * (latRef === "S" ? -1 : 1);
    }
    if (lngVal && lngVal.length === 3) {
      lng = dmsToDeg(lngVal) * (lngRef === "W" ? -1 : 1);
    }
  }

  return { takenAt, lat, lng, raw: ifd0 };
}

function dmsToDeg(dms: number[]): number {
  return dms[0] + dms[1] / 60 + dms[2] / 3600;
}

// Read a single IFD — returns a tag → value map for the entries we recognize.
function readIfd(
  view: DataView, ifdStart: number, tiffStart: number, little: boolean,
): Record<number, unknown> {
  const result: Record<number, unknown> = {};
  const entries = view.getUint16(ifdStart, little);
  for (let i = 0; i < entries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, little);
    const type = view.getUint16(entryOffset + 2, little);
    const count = view.getUint32(entryOffset + 4, little);
    const valueOffset = entryOffset + 8;

    // Type 2 (ASCII), Type 3 (SHORT), Type 4 (LONG), Type 5 (RATIONAL)
    if (type === 2) {
      const size = count;
      const dataOffset = size <= 4 ? valueOffset : tiffStart + view.getUint32(valueOffset, little);
      let s = "";
      for (let j = 0; j < size - 1; j++) {
        s += String.fromCharCode(view.getUint8(dataOffset + j));
      }
      result[tag] = s;
    } else if (type === 3 && count === 1) {
      result[tag] = view.getUint16(valueOffset, little);
    } else if (type === 4 && count === 1) {
      result[tag] = view.getUint32(valueOffset, little);
    } else if (type === 5 && count >= 1) {
      const rationals: number[] = [];
      const dataStart = tiffStart + view.getUint32(valueOffset, little);
      for (let j = 0; j < Math.min(count, 3); j++) {
        const n = view.getUint32(dataStart + j * 8, little);
        const d = view.getUint32(dataStart + j * 8 + 4, little);
        rationals.push(d === 0 ? 0 : n / d);
      }
      result[tag] = rationals;
    }
  }
  return result;
}
