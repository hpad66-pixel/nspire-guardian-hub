// Convert a user-attached file into the { kind, mediaType, data } shape the
// draft-* edge functions send to Claude as a native document/image block.
// pdf/image → base64; text-like → raw text. Mirrors the change-order generator.

export interface BackgroundDoc {
  kind: "pdf" | "image" | "text";
  mediaType: string;
  data: string;
  name: string;
}

export const MAX_BG_BYTES = 20 * 1024 * 1024; // 20 MB

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function fileToBackgroundDoc(file: File): Promise<BackgroundDoc> {
  if (file.size > MAX_BG_BYTES) {
    throw new Error(`${file.name} is larger than 20 MB`);
  }
  const type = file.type || "";
  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return { kind: "pdf", mediaType: "application/pdf", data: await readAsBase64(file), name: file.name };
  }
  if (IMAGE_TYPES.has(type)) {
    return { kind: "image", mediaType: type, data: await readAsBase64(file), name: file.name };
  }
  // Everything else (txt, md, csv, tsv) → plain text.
  return { kind: "text", mediaType: "text/plain", data: await readAsText(file), name: file.name };
}
