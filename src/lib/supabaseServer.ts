import dns from "dns";
import { createClient } from "@supabase/supabase-js";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

function getEnv(name: string): string {
  return process.env[name] || "";
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("⚠️ [SARA Supabase] Missing Supabase environment variables in GT Assistant.");
}

const resilientFetch: typeof fetch = async (input, init) => {
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err: any) {
      lastErr = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
};

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: resilientFetch,
  },
});
