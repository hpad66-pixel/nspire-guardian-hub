import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'htm': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'xml': 'application/xml; charset=utf-8',
    'svg': 'image/svg+xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'otf': 'font/otf',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'txt': 'text/plain; charset=utf-8',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'swf': 'application/x-shockwave-flash',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Support two modes:
    // 1. ?path=full/path/to/file.html (legacy)
    // 2. ?base=courses/uuid&file=relative/path.html (for relative URL resolution)
    let fullPath: string;
    
    const legacyPath = url.searchParams.get('path');
    const basePath = url.searchParams.get('base');
    const filePath = url.searchParams.get('file');
    
    if (legacyPath) {
      fullPath = legacyPath;
    } else if (basePath && filePath) {
      // Clean up file path - remove leading slashes
      const cleanFile = filePath.replace(/^\/+/, '');
      fullPath = `${basePath}/${cleanFile}`;
    } else {
      return new Response(JSON.stringify({ error: 'Missing path or base+file parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security: prevent directory traversal
    if (fullPath.includes('..')) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Serving file: ${fullPath}`);

    // Download the file from storage
    const { data, error } = await supabase.storage
      .from('training-courses')
      .download(fullPath);

    if (error) {
      console.error('Storage error:', error);
      return new Response(JSON.stringify({ error: 'File not found', path: fullPath }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = getMimeType(fullPath);
    const arrayBuffer = await data.arrayBuffer();

    // For HTML files, rewrite relative URLs to go through this proxy
    if (contentType.startsWith('text/html') && basePath) {
      const text = new TextDecoder().decode(arrayBuffer);
      const functionUrl = `${supabaseUrl}/functions/v1/serve-course-content`;
      
      // Rewrite src and href attributes to use the proxy
      const rewritten = text
        // Rewrite src="..." attributes (excluding data: and http(s):// URLs)
        .replace(
          /(\s(?:src|href)=["'])(?!(?:data:|https?:|\/\/|#))([^"']+)(["'])/gi,
          (_match, prefix, path, suffix) => {
            const cleanPath = path.replace(/^\.\//, '');
            return `${prefix}${functionUrl}?base=${encodeURIComponent(basePath)}&file=${encodeURIComponent(cleanPath)}${suffix}`;
          }
        )
        // Rewrite url(...) in inline styles (excluding data: and http(s):// URLs)
        .replace(
          /url\(["']?(?!(?:data:|https?:|\/\/))([^"')]+)["']?\)/gi,
          (_match, path) => {
            const cleanPath = path.replace(/^\.\//, '');
            return `url("${functionUrl}?base=${encodeURIComponent(basePath)}&file=${encodeURIComponent(cleanPath)}")`;
          }
        );
      
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // For CSS files, rewrite url() references
    if (contentType.startsWith('text/css') && basePath) {
      const text = new TextDecoder().decode(arrayBuffer);
      const functionUrl = `${supabaseUrl}/functions/v1/serve-course-content`;
      
      const rewritten = text.replace(
        /url\(["']?(?!(?:data:|https?:|\/\/))([^"')]+)["']?\)/gi,
        (_match, path) => {
          const cleanPath = path.replace(/^\.\//, '');
          return `url("${functionUrl}?base=${encodeURIComponent(basePath)}&file=${encodeURIComponent(cleanPath)}")`;
        }
      );
      
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving content:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
