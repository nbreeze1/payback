// Public Supabase settings. The publishable key is meant to ship to the browser
// (row-level security protects the data), so it's safe to commit as a fallback.
// Env vars still take priority if they're set (e.g. in Vercel or .env.local).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vcpsvlhsnwqgcccbvjpl.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vrPA4E7nUI3tPLsiCIkx0Q_nIbS3lqj";
