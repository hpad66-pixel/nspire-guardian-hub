import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Common entry points for Articulate exports
const ENTRY_POINT_CANDIDATES = [
  "story.html", // Storyline 360
  "index.html", // Rise 360 / generic
  "story_html5.html", // Older Storyline exports
  "scormdriver/indexAPI.html", // SCORM wrapper
];

interface ProcessResult {
  success: boolean;
  coursePath?: string;
  entryFile?: string;
  fileCount?: number;
  totalSize?: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("courseId") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: "No courseId provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return new Response(
        JSON.stringify({ error: "File must be a ZIP archive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing course upload: ${file.name} (${file.size} bytes) for course ${courseId}`);

    // Read ZIP file as array buffer
    const zipData = await file.arrayBuffer();
    
    // Import fflate for ZIP extraction (lightweight, runs in Deno)
    const { unzipSync } = await import("https://esm.sh/fflate@0.8.2");
    
    // Unzip the file
    const unzipped = unzipSync(new Uint8Array(zipData));
    
    // Get file list and find entry point
    const fileNames = Object.keys(unzipped);
    let entryFile: string | null = null;
    let fileCount = 0;
    let totalSize = 0;

    // Determine the root folder (some exports have a wrapper folder)
    let rootPrefix = "";
    const firstFile = fileNames[0];
    if (firstFile && !firstFile.includes("/")) {
      // No folder structure at root, might be flat
    } else if (firstFile) {
      // Check if all files share a common root folder
      const potentialRoot = firstFile.split("/")[0] + "/";
      const allShareRoot = fileNames.every(f => f.startsWith(potentialRoot) || f === potentialRoot.slice(0, -1));
      if (allShareRoot) {
        rootPrefix = potentialRoot;
      }
    }

    // Find entry point
    for (const candidate of ENTRY_POINT_CANDIDATES) {
      const fullPath = rootPrefix + candidate;
      const withoutRoot = candidate;
      
      if (fileNames.includes(fullPath)) {
        entryFile = candidate;
        break;
      } else if (fileNames.includes(withoutRoot)) {
        entryFile = withoutRoot;
        break;
      }
    }

    // If no standard entry point found, look for any .html file at root level
    if (!entryFile) {
      for (const fileName of fileNames) {
        const relativePath = rootPrefix ? fileName.replace(rootPrefix, "") : fileName;
        if (relativePath.endsWith(".html") && !relativePath.includes("/")) {
          entryFile = relativePath;
          break;
        }
      }
    }

    if (!entryFile) {
      return new Response(
        JSON.stringify({ error: "Could not find entry point HTML file in ZIP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found entry point: ${entryFile}, root prefix: "${rootPrefix}"`);

    // Upload each file to storage
    const coursePath = `courses/${courseId}`;
    const uploadPromises: Promise<void>[] = [];
    const errors: string[] = [];

    for (const [filePath, fileData] of Object.entries(unzipped)) {
      // Skip directories (they end with /)
      if (filePath.endsWith("/")) continue;
      
      // Skip hidden files and macOS resource forks
      if (filePath.includes("__MACOSX") || filePath.includes(".DS_Store")) continue;

      // Remove root prefix for cleaner paths
      const relativePath = rootPrefix ? filePath.replace(rootPrefix, "") : filePath;
      if (!relativePath) continue;

      const storagePath = `${coursePath}/${relativePath}`;
      const data = fileData as Uint8Array;
      
      fileCount++;
      totalSize += data.length;

      // Determine content type
      const ext = relativePath.split(".").pop()?.toLowerCase() || "";
      const contentType = getContentType(ext);

      uploadPromises.push(
        (async () => {
          const { error: uploadError } = await supabase.storage
            .from("training-courses")
            .upload(storagePath, data, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error(`Failed to upload ${storagePath}:`, uploadError);
            errors.push(`${relativePath}: ${uploadError.message}`);
          }
        })()
      );
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    if (errors.length > 0 && errors.length === fileCount) {
      return new Response(
        JSON.stringify({ error: "All file uploads failed", details: errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Uploaded ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

    // Update the course record with the content path
    const { error: updateError } = await supabase
      .from("training_courses")
      .update({
        content_path: coursePath,
        entry_file: entryFile,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId);

    if (updateError) {
      console.error("Failed to update course record:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update course record", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: ProcessResult = {
      success: true,
      coursePath,
      entryFile,
      fileCount,
      totalSize,
    };

    console.log("Course processing complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error processing course:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    // HTML - ensure charset is specified for proper rendering
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    // Styles
    css: "text/css; charset=utf-8",
    // Scripts
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    // Data
    json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    // Audio
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    // Fonts
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    eot: "application/vnd.ms-fontobject",
    // Documents
    pdf: "application/pdf",
    // Legacy
    swf: "application/x-shockwave-flash",
    // Data files
    txt: "text/plain; charset=utf-8",
    vtt: "text/vtt; charset=utf-8",
    srt: "text/plain; charset=utf-8",
  };
  return types[ext] || "application/octet-stream";
}
