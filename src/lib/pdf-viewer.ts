/**
 * B2 · pdf-viewer — thin wrapper around pdf.js loaded from CDN.
 *
 * We avoid adding the `pdfjs-dist` npm dependency to keep the bundle thin and
 * to survive the package.json corruption issues from earlier. pdf.js is loaded
 * on first use via dynamic script injection; once available, `renderPage()`
 * returns a data-URL PNG of a given page at a given scale.
 *
 * Usage:
 *   const img = await renderPage(signedUrl, pageNumber, { scale: 1.5 });
 *   return <img src={img} />;
 */

const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

let loader: Promise<any> | null = null;

async function loadPdfjs(): Promise<any> {
  if (loader) return loader;
  loader = new Promise<any>(async (resolve, reject) => {
    try {
      const mod = await import(/* @vite-ignore */ PDFJS_CDN);
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(mod);
    } catch (e) {
      loader = null;
      reject(e);
    }
  });
  return loader;
}

export interface RenderOptions {
  scale?: number;
  background?: string;
}

export async function renderPage(
  pdfUrl: string,
  pageNumber: number,
  opts: RenderOptions = {},
): Promise<string> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ url: pdfUrl });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: opts.scale ?? 1.5 });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}

export async function getPageCount(pdfUrl: string): Promise<number> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ url: pdfUrl });
  const doc = await loadingTask.promise;
  return doc.numPages;
}

/** Resolve a signed URL for a Supabase storage object so pdf.js can fetch it. */
export async function signedUrlFor(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
