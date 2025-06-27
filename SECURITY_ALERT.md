# 🚨 IMMEDIATE SECURITY ACTION REQUIRED

## Critical Security Issues Found

### 1. EXPOSED API KEYS IN MCP CONFIG
**File**: `.mcp/claude-desktop-config.json`
**Issue**: Contains live Stripe API key and VAPI token

**IMMEDIATE ACTIONS REQUIRED:**
1. **Rotate all exposed keys immediately:**
   - Stripe API key: `sk_live_51REpxD2Kq2uoYmby...`
   - VAPI token: `c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3`
   - Supabase access token: `sbp_8096d1900030bb85...`

2. **Add to .gitignore:**
   ```
   .mcp/claude-desktop-config.json
   ```

3. **Use template file:**
   - Copy `.mcp/claude-desktop-config.example.json` to `.mcp/claude-desktop-config.json`
   - Replace with your new rotated keys

### 2. DANGEROUS DATABASE TRIGGER REMOVED
**File**: `supabase/migrations/20250627000001_remove_dangerous_trigger.sql`
**Issue**: Service role JWT was hardcoded in database trigger

**Action**: Migration created to remove the trigger. Apply immediately.

### 3. ENVIRONMENT VARIABLES IMPLEMENTED
**Files Updated**: 
- `src/integrations/supabase/client.ts` - Now uses environment variables
- `.env.example` - Template for required environment variables

**Next Steps:**
1. Configure Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Configure Supabase environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `VAPI_TOKEN`

## Production Deployment Blocked Until These Issues Are Resolved

**Priority Order:**
1. Rotate all exposed API keys (URGENT)
2. Apply database migration to remove dangerous trigger
3. Configure environment variables in Vercel and Supabase
4. Add MCP config to .gitignore
5. Test that application works with environment variables