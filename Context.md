# SweetyOnCall – Technical Context & Architecture

## Overview
SweetyOnCall is a production-grade AI-powered phone call booking platform. It enables users to book and connect with AI voice companions, handling the full flow from booking to payment to call completion. The system is designed for privacy, reliability, and scalability, with a modern frontend, robust backend, and secure integrations.

---

## System Architecture
- **Frontend**: React 18 SPA (Vite, TypeScript, shadcn/ui, Tailwind CSS)
- **Backend**: Supabase (PostgreSQL, Edge Functions, Vault, Realtime, pg_cron)
- **Payments**: Stripe (Checkout, Webhooks)
- **AI Calls**: VAPI (Voice AI Platform)
- **Deployment**: Vercel (frontend), Supabase (backend)

---

## Frontend Details
- **SPA**: React Router for navigation (/, /waiting, /booking-confirmation, 404)
- **Core Components**: BookingForm, PricingCards, Testimonials, FAQ, Hero, Navbar, Footer, SEO, JsonLd
- **State Management**: React Query for server state, React Hook Form + Zod for validation
- **UI/UX**: shadcn/ui, Tailwind CSS, custom theme, responsive, accessible, dark mode
- **Realtime**: Booking status updates via Supabase Realtime

---

## Backend Details
### Database (Supabase PostgreSQL)
- **users**: id (uuid), name, phone (unique), email, created_at, last_free_trial
- **plans**: id, key (enum: free_trial, standard, extended, premium), price_cents, duration_seconds, vapi_assistant_id
- **bookings**: id, user_id, plan_id, status (enum), vapi_call_id, message, created_at, payment_intent_id, payment_status, payment_amount, call_duration, error_message
- **payments**: id, booking_id, amount_cents, currency, status, cryptomus_invoice_id, cryptomus_payment_id, created_at
- **vapi_accounts**: id, name, api_key (vault), phone_number_id, max_concurrent_calls, current_active_calls, is_active, created_at, updated_at, vault_secret_name
- **vapi_agents**: id, vapi_account_id, agent_id, agent_type, max_concurrent_calls, current_active_calls, is_active, priority, created_at, updated_at
- **call_queue**: id, booking_id, plan_type, priority, status, assigned_agent_id, assigned_account_id, retry_count, max_retries, created_at, updated_at, scheduled_for
- **call_events**: id, booking_id, event_time, event_type, details, events
- **Partitioned Tables**: call_events partitioned by month for scalability

### Edge Functions
- **check-vapi-concurrency**: Checks VAPI account capacity before call
- **initiate-vapi-call**: Initiates AI call, manages concurrency, updates status
- **process-call-queue**: Processes queued calls, assigns agents, handles retries (cron + manual)
- **handle-vapi-webhook**: Handles VAPI webhook events, updates call status, rate-limited, signature-validated
- **create-stripe-checkout**: Creates Stripe checkout session, validates user/email, updates booking
- **stripe-webhook**: Handles Stripe payment events, updates payment/booking, triggers call
- **check-payment-status**: Verifies payment status with Stripe
- **check-call-durations**: Monitors and completes calls exceeding duration

### RPC Functions
- **upsert_user**: Atomic user create/update
- **check_free_trial_eligibility**: 24h cooldown enforcement
- **update_last_free_trial**: Updates last free trial timestamp
- **increment_call_count / safe_decrement_call_count**: Thread-safe call counters
- **get_available_agent**: Finds available agent for plan
- **handle_call_end**: Cleans up after call ends
- **cleanup_inactive_call**: Cleans up failed/stale calls

### Cron Jobs (pg_cron)
- **process-call-queue**: Every minute
- **cleanup-queue**: Hourly
- **call duration monitoring**: Automated

---

## Integrations
- **Stripe**: Payment processing, webhooks, customer management
- **VAPI**: AI voice calls, webhook event handling, concurrency/capacity management
- **Supabase Vault**: API key encryption
- **Realtime**: Live booking status updates

---

## Security Practices
- **JWT Authentication** (Supabase)
- **Row-Level Security** on all tables
- **API Key Encryption** (Vault)
- **Webhook Signature Validation** (Stripe, VAPI)
- **CORS**: Strict production domain
- **Rate Limiting**: Webhooks (100 req/min)
- **Input Validation**: Zod, backend checks
- **No PII Logging**

---

## Operational Practices
- **Monitoring**: Vercel, Supabase, Stripe, VAPI dashboards
- **Key Rotation**: Monthly
- **Error Log Review**: Weekly
- **Dependency Updates & Security Audits**: Monthly
- **Database Migrations**: Version-controlled, in `supabase/migrations/`

---

## Deployment
- **Frontend**: Vercel (set env vars in dashboard)
- **Backend**: Supabase (apply all migrations, configure env vars)
- **Stripe**: Live keys, webhooks
- **VAPI**: Production API key, webhook
- **Cron Jobs**: Ensure `pg_cron` is enabled and scheduled

---

## Support & Maintenance
- Use Stripe, VAPI, Supabase, Vercel dashboards for support and monitoring
- See README.md for developer/deployment instructions

---

## License
Proprietary. All rights reserved. 