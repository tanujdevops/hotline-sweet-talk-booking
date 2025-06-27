import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for security - configure these in Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://emtwxyywgszhboxpaunk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdHd4eXl3Z3N6aGJveHBhdW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjQ0OTUsImV4cCI6MjA2MDMwMDQ5NX0.Oxpq6AhWj-39JSkyoQO8uyY-eVZG1rrKBWlrhNc_FeM";

// Validate environment variables in production
if (import.meta.env.PROD && (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error('Missing required Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);