# SweetyOnCall – Production-Ready AI Call Booking Platform

## Overview
SweetyOnCall is a modern, production-grade AI-powered phone call booking system. It connects users with AI companions for private, real-time conversations. The system is built for reliability, security, and scalability, with a React/Vite frontend deployed on Vercel and a robust Supabase backend (PostgreSQL, Edge Functions, Vault, Realtime, pg_cron). Payments are processed via Stripe, and AI calls are handled by VAPI.

---

## Table of Contents
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Frontend](#frontend)
- [Backend](#backend)
- [External Integrations](#external-integrations)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Architecture
- **Frontend**: React 18 + TypeScript + Vite, hosted on Vercel
- **Backend**: Supabase (PostgreSQL, Edge Functions, Vault, Realtime, pg_cron)
- **Payments**: Stripe (Checkout, Webhooks)
- **AI Calls**: VAPI (Voice AI Platform, webhooks, concurrency management)

---

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, React Query, React Router, React Hook Form, Zod, Sonner
- **Backend**: Supabase (PostgreSQL, Edge Functions, Vault, Realtime, pg_cron)
- **Payments**: Stripe
- **AI Calls**: VAPI
- **Deployment**: Vercel (frontend), Supabase (backend)

---

## Frontend
- **SPA** with React Router (Home, Waiting, Booking Confirmation, 404)
- **BookingForm**: Name, phone, email, plan selection, validation
- **PricingCards**: Interactive plan selection
- **Testimonials, FAQ, Hero, Navbar, Footer, SEO, JsonLd**
- **UI**: shadcn/ui, Tailwind CSS, custom theme, responsive, accessible
- **State**: React Query for server state, React Hook Form + Zod for validation
- **Realtime**: Booking status updates via Supabase Realtime

---

## Backend (Supabase)
- **Database**: PostgreSQL with RLS, Vault for API key encryption
- **Core Tables**: users, plans, bookings, payments, vapi_accounts, vapi_agents, call_queue, call_events
- **Edge Functions**: 
  - `check-vapi-concurrency`
  - `initiate-vapi-call`
  - `process-call-queue`
  - `handle-vapi-webhook`
  - `create-stripe-checkout`
  - `stripe-webhook`
  - `check-payment-status`
  - `check-call-durations`
- **RPC Functions**: upsert_user, check_free_trial_eligibility, update_last_free_trial, increment_call_count, safe_decrement_call_count, get_available_agent, handle_call_end, cleanup_inactive_call
- **Cron Jobs**: Queue processing (every minute), cleanup (hourly), call duration monitoring
- **Realtime**: Live booking status updates

---

## External Integrations
- **Stripe**: Payment processing, webhooks, customer management
- **VAPI**: AI voice calls, webhook event handling, concurrency/capacity management
- **Supabase Vault**: Secure API key storage

---

## Security
- **JWT Authentication** (Supabase)
- **RLS**: Row-level security on all tables
- **API Key Encryption**: Supabase Vault
- **Webhook Signature Validation**: Stripe & VAPI
- **CORS**: Strict production domain restrictions
- **Rate Limiting**: Webhooks (100 req/min)
- **Input Validation**: Zod, React Hook Form, backend checks
- **No PII Logging**

---

## Environment Variables
### Frontend (Vercel)
- `VITE_SUPABASE_URL` – Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key

### Backend (Supabase Edge Functions)
- `SUPABASE_URL` – Project URL
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key
- `STRIPE_SECRET_KEY` – Stripe secret key
- `STRIPE_WEBHOOK_SECRET` – Stripe webhook secret
- `VAPI_TOKEN` – VAPI API key
- `VAPI_WEBHOOK_SECRET` – VAPI webhook secret
- `CORS_ORIGIN` – Allowed frontend origin
- `CRON_SECRET` – Secret for cron jobs

---

## Local Development
1. Clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in required variables
4. Start dev server: `npm run dev`
5. Edge functions: Use Supabase CLI for local testing

---

## Production Deployment
- **Frontend**: Deploy to Vercel, set all environment variables in Vercel dashboard
- **Backend**: Supabase project, apply all migrations in `supabase/migrations/`
- **Stripe**: Configure live keys, webhooks
- **VAPI**: Configure production API key, webhook
- **Cron Jobs**: Ensure `pg_cron` is enabled and scheduled
- **Monitoring**: Set up Vercel, Supabase, Stripe, and VAPI dashboards

---

## Monitoring & Maintenance
- Monitor payment success, call connection, queue times, and system uptime
- Rotate API keys monthly
- Review error logs and analytics weekly
- Update dependencies and run security audits monthly

---

## Support
- Stripe, VAPI, Supabase, Vercel dashboards for support and monitoring

---

## License
Proprietary. All rights reserved. 