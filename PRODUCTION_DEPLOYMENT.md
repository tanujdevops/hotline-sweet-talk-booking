# 🚀 Production Deployment Guide

## Phase 1: Critical Security Actions (IMMEDIATE)

### 1. Rotate All Exposed API Keys
**URGENT**: The following keys were found exposed in code and must be rotated immediately:

- **Stripe API Key**: `sk_live_51REpxD2Kq2uoYmby...` (Replace with new live key)
- **VAPI Token**: `c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3` (Get new token)
- **Supabase Access Token**: `sbp_8096d1900030bb85...` (Generate new token)

### 2. Apply Database Migrations

Run these migrations in order:

```sql
-- 1. Remove dangerous trigger (CRITICAL)
\i supabase/migrations/20250627000001_remove_dangerous_trigger.sql

-- 2. Encrypt API keys
\i supabase/migrations/20250627000002_encrypt_api_keys.sql

-- 3. Add email to users
\i supabase/migrations/20250627000003_add_email_to_users.sql

-- 4. Fix plan type mismatch
\i supabase/migrations/20250627000004_fix_plan_type_mismatch.sql

-- 5. Add atomic user operations
\i supabase/migrations/20250627000005_atomic_user_operations.sql

-- 6. Setup cron jobs
\i supabase/migrations/20250627000006_setup_cron_jobs.sql
```

### 3. Configure Environment Variables

#### Vercel Environment Variables (Frontend)
```bash
VITE_SUPABASE_URL=https://emtwxyywgszhboxpaunk.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key
```

#### Supabase Environment Variables (Backend)
```bash
SUPABASE_URL=https://emtwxyywgszhboxpaunk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
STRIPE_SECRET_KEY=your-new-live-stripe-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
VAPI_TOKEN=your-new-vapi-token
VAPI_WEBHOOK_SECRET=your-vapi-webhook-secret
CORS_ORIGIN=https://sweetyoncall.com
CRON_SECRET=your-random-cron-secret
```

## Phase 2: Stripe Production Setup

### 1. Complete Stripe Account Verification
- [ ] Business verification completed
- [ ] Bank account connected for payouts
- [ ] Tax information submitted

### 2. Configure Live Webhooks
- **Endpoint URL**: `https://emtwxyywgszhboxpaunk.supabase.co/functions/v1/stripe-webhook`
- **Events to listen for**:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

### 3. Test Payment Flow
- [ ] Test with real credit card (small amount)
- [ ] Verify webhook delivery
- [ ] Confirm call initiation after payment

## Phase 3: VAPI Production Setup

### 1. Configure VAPI Account
- [ ] Verify account limits (10 concurrent calls)
- [ ] Set up production voice agents
- [ ] Configure phone numbers

### 2. Webhook Configuration
- **Endpoint URL**: `https://emtwxyywgszhboxpaunk.supabase.co/functions/v1/handle-vapi-webhook`
- **Secret**: Set `VAPI_WEBHOOK_SECRET` environment variable

### 3. Test Voice Integration
- [ ] Test call initiation
- [ ] Verify webhook delivery
- [ ] Test call completion flow

## Phase 4: Queue Processing Setup

### 1. Enable pg_cron (Manual Step)
```sql
-- Run as superuser in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule queue processing every minute
SELECT cron.schedule('process-call-queue', '* * * * *', 'SELECT process_queue_cron();');

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-queue', '0 * * * *', 'SELECT cleanup_stale_queue();');
```

### 2. Verify Cron Jobs
```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Check job execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Phase 5: Monitoring & Alerting

### 1. Set Up Monitoring
- [ ] Supabase monitoring dashboard
- [ ] Vercel analytics
- [ ] Stripe dashboard monitoring

### 2. Key Metrics to Monitor
- Payment success rate (target: >99%)
- Call connection rate (target: >95%)
- Queue processing time (target: <2 minutes)
- System uptime (target: >99.9%)

### 3. Set Up Alerts
- [ ] Payment failures
- [ ] Queue backing up
- [ ] VAPI capacity reached
- [ ] System errors

## Phase 6: Production Testing

### 1. End-to-End Testing
- [ ] Complete user journey (booking → payment → call)
- [ ] Test with near-capacity load (8-9 concurrent calls)
- [ ] Test error scenarios
- [ ] Test queue overflow handling

### 2. Security Testing
- [ ] Verify no secrets in deployed code
- [ ] Test webhook security
- [ ] Validate CORS restrictions
- [ ] Run security scan

## Phase 7: Go-Live Checklist

### Pre-Launch
- [ ] All migrations applied
- [ ] All environment variables configured
- [ ] All services tested
- [ ] Monitoring setup complete
- [ ] Backup procedures in place

### Launch Day
- [ ] Deploy to production
- [ ] Monitor all systems
- [ ] Test with small user group first
- [ ] Scale gradually

### Post-Launch
- [ ] 24/7 monitoring for first week
- [ ] Daily metric reviews
- [ ] Weekly capacity planning
- [ ] Monthly security reviews

## Emergency Procedures

### If Payment Processing Fails
1. Check Stripe webhook delivery in dashboard
2. Verify environment variables are set
3. Check edge function logs in Supabase
4. Manually process failed payments if needed

### If Calls Don't Initiate
1. Check VAPI account capacity
2. Verify queue processing is running
3. Check agent availability
4. Manually trigger queue processing if needed

### If System Overloaded
1. Monitor concurrent call count
2. Communicate wait times to users
3. Consider temporary capacity restrictions
4. Plan for additional VAPI accounts

## Support Contacts
- Stripe Support: [Stripe Dashboard]
- VAPI Support: [VAPI Dashboard]
- Supabase Support: [Supabase Dashboard]
- Vercel Support: [Vercel Dashboard]

---

**⚠️ CRITICAL**: Do not deploy to production until ALL Phase 1 security actions are completed and ALL exposed API keys are rotated.