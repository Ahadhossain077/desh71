import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.DESh71_SUPABASE_CONFIG || {};
const configured = Boolean(config.url && config.anonKey && !config.url.includes("YOUR_") && !config.anonKey.includes("YOUR_"));
export const supabase = configured ? createClient(config.url, config.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;
export const isSupabaseConfigured = configured;
