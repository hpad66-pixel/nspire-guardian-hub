export async function onRequest(context) {
  const config = {
    supabaseUrl: context.env.VITE_SUPABASE_URL || "",
    supabasePublishableKey: context.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
    supabaseProjectId: context.env.VITE_SUPABASE_PROJECT_ID || "",
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
