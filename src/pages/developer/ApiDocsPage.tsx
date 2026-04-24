import { useEffect } from "react";

/**
 * T4.17 · Renders the public OpenAPI 3.1 spec at /public/openapi.yaml as
 * browsable docs via Redoc (loaded from CDN to avoid adding a dep).
 */
export default function ApiDocsPage() {
  useEffect(() => {
    const id = "redoc-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div dangerouslySetInnerHTML={{ __html: `<redoc spec-url="/openapi.yaml"></redoc>` }} />
    </div>
  );
}
