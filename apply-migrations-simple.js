import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = "https://emtwxyywgszhboxpaunk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdHd4eXl3Z3N6aGJveHBhdW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjQ0OTUsImV4cCI6MjA2MDMwMDQ5NX0.Oxpq6AhWj-39JSkyoQO8uyY-eVZG1rrKBWlrhNc_FeM";

async function applyMigrations() {
  console.log('🚀 Reading migration files...');
  
  try {
    // Read migration files
    const migration1 = readFileSync('./supabase/migrations/20250621000000_fix_missing_columns.sql', 'utf8');
    const migration2 = readFileSync('./supabase/migrations/20250621000001_setup_cron_jobs.sql', 'utf8');
    
    console.log('📄 Migration 1 content length:', migration1.length);
    console.log('📄 Migration 2 content length:', migration2.length);
    
    console.log('✅ Migration files read successfully!');
    console.log('');
    console.log('🔧 Please apply these migrations manually in your Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/emtwxyywgszhboxpaunk/sql');
    console.log('2. Copy and run the contents of: supabase/migrations/20250621000000_fix_missing_columns.sql');
    console.log('3. Then copy and run: supabase/migrations/20250621000001_setup_cron_jobs.sql');
    console.log('');
    console.log('The migrations will:');
    console.log('- Add missing call_duration and error_message columns');
    console.log('- Create missing database functions for concurrency control');
    console.log('- Set up automated cron jobs for maintenance');
    
  } catch (error) {
    console.error('💥 Failed to read migrations:', error);
  }
}

applyMigrations();