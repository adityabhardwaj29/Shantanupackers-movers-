# Shantanu Packers and Movers - Official Backend & Database Architecture

Government MSME Registered Enterprise: **UDYAM-MH-17-0244739**

Production-ready backend architecture powered by **Supabase PostgreSQL**, **Supabase Edge Functions**, and **Resend Email Integration**.

---

## 1. Architecture Overview (Option A: Direct Edge Function Pipeline)

```
Customer Submission (quote.html / index.html)
        ↓
Supabase Edge Function (`submit-quote`)
        ↓
[1] CORS Validation (Allowed Origins)
[2] Rate Limiting (IP & Phone Frequency Check)
[3] Input Validation & Sanitization (XSS Prevention)
[4] Idempotency & Duplicate Check (5-min window)
[5] Insert Record into PostgreSQL (`quote_requests`)
[6] Resend Email Dispatch to `shantanupackers@gmail.com`
        ↓
Safe Structured Response to Client ({ success: true, quote_id: "MRL-2026-..." })
```

---

## 2. Supabase Setup & Deployment Guide

### Step 1: Database Schema & Row Level Security (RLS)
1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the SQL script from [`supabase/schema.sql`](supabase/schema.sql).
3. This creates:
   - Table `quote_requests` with UUID primary keys, unique constraint, and format `MRL-YYYY-XXXXXX`.
   - Table `quote_rate_limits` for anti-abuse tracking.
   - Comprehensive Row Level Security (RLS) policies blocking unauthorized public `SELECT`, `UPDATE`, and `DELETE` queries.
   - Indexes on `quote_id`, `created_at`, `phone`, and `status`.

### Step 2: Set Edge Function Secrets
In Supabase CLI or Dashboard Secrets, set:
```bash
supabase secrets set RESEND_API_KEY=re_your_resend_api_key
supabase secrets set NOTIFICATION_EMAIL=shantanupackers@gmail.com
supabase secrets set RESEND_FROM_EMAIL="Shantanu Movers <quotes@shantanupackers.com>"
```

### Step 3: Deploy the Edge Function
```bash
supabase functions deploy submit-quote --no-verify-jwt
```
*(Note: `--no-verify-jwt` is used because the public customer quote form is unauthenticated. Security is strictly enforced via CORS, Rate Limiting, Sanitization, and RLS).*

### Step 4: Configure Frontend Connection
In `js/supabase.js` (or via `window.SUPABASE_CONFIG`), specify your public project credentials:
```javascript
window.SUPABASE_CONFIG = {
  url: 'https://your-project-ref.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_public_anon_key'
};
```

---

## 3. Security Protections Enforced

- **Zero Secret Exposure**: Frontend contains ONLY public `anonKey`. The `service_role` key and `RESEND_API_KEY` are strictly isolated inside Supabase Edge Function Secrets.
- **Data Privacy**: Anonymous users CANNOT read or download customer quote requests from the database.
- **XSS Protection**: All user-submitted content is sanitized and entity-escaped before rendering in HTML email templates.
- **Duplicate Protection**: Form double-clicks and repeated submissions within 5 minutes are suppressed and returned idempotently.
- **Strict CORS**: Origin allowlist prevents unauthorized cross-site invocations.
