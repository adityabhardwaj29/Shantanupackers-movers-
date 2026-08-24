-- ============================================================================
-- SHANTANU PACKERS AND MOVERS - OFFICIAL PRODUCTION DATABASE ARCHITECTURE
-- PostgreSQL Schema & Security Policies for Supabase
-- Govt. MSME Enterprise: UDYAM-MH-17-0244739
-- ============================================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. QUOTE ID GENERATOR SEQUENCE & FUNCTION
-- Format: STN-YYYY-XXXXXX (e.g., STN-2026-849201)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS quote_id_seq START WITH 100001;

CREATE OR REPLACE FUNCTION public.generate_quote_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_yr TEXT;
  seq_val BIGINT;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('quote_id_seq');
  RETURN 'STN-' || current_yr || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

-- ============================================================================
-- 2. PRIMARY TABLE: quote_requests
-- Production-ready, strictly constrained, sanitized schema
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT UNIQUE NOT NULL DEFAULT public.generate_quote_id(),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) >= 2 AND length(full_name) <= 100),
  phone TEXT NOT NULL CHECK (length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10 AND length(phone) <= 20),
  email TEXT CHECK (email IS NULL OR (length(email) <= 150 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
  pickup_location TEXT NOT NULL CHECK (length(trim(pickup_location)) >= 2 AND length(pickup_location) <= 300),
  drop_location TEXT NOT NULL CHECK (length(trim(drop_location)) >= 2 AND length(drop_location) <= 300),
  moving_date DATE NOT NULL,
  moving_time TEXT DEFAULT 'Morning (8 AM - 12 PM)' CHECK (length(moving_time) <= 100),
  service_type TEXT NOT NULL CHECK (length(service_type) <= 100),
  vehicle_type TEXT DEFAULT 'Standard Move' CHECK (length(vehicle_type) <= 100),
  floor_number TEXT DEFAULT 'Ground Floor' CHECK (length(floor_number) <= 50),
  lift_available BOOLEAN DEFAULT false,
  packing_required TEXT DEFAULT 'Full Professional Packing' CHECK (length(packing_required) <= 100),
  additional_notes TEXT CHECK (additional_notes IS NULL OR length(additional_notes) <= 2000),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'contacted', 'survey_scheduled', 'booked', 'in_transit', 'completed', 'cancelled')),
  ip_address TEXT CHECK (ip_address IS NULL OR length(ip_address) <= 64),
  user_agent TEXT CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 3. AUDIT & ABUSE CONTROL TABLE: quote_rate_limits
-- Tracks submission frequency per client identifier/IP to prevent spam & flooding
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quote_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP hash or normalized phone
  action_type TEXT DEFAULT 'quote_submit' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ident ON public.quote_rate_limits (identifier, created_at DESC);

-- Automatic cleanup function for rate limit entries older than 2 hours
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.quote_rate_limits
  WHERE created_at < now() - INTERVAL '2 hours';
END;
$$;

-- ============================================================================
-- 4. PERFORMANCE & LOOKUP INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quote_requests_quote_id ON public.quote_requests (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON public.quote_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_phone ON public.quote_requests (phone);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON public.quote_requests (email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests (status);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict least-privilege security model
-- ============================================================================
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Deny all public select on quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Deny all public update on quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Deny all public delete on quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Allow anonymous quote submissions" ON public.quote_requests;
DROP POLICY IF EXISTS "Allow authenticated admin users to read quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Allow authenticated admin users to update quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Allow authenticated admin users to delete quotes" ON public.quote_requests;

-- A. PUBLIC / ANONYMOUS POLICIES
-- Public customers CANNOT SELECT, UPDATE, or DELETE quote requests (100% data privacy)
-- Only restricted INSERT is permitted with rigorous field validation checks
CREATE POLICY "Allow restricted anonymous quote submissions"
  ON public.quote_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) >= 2 AND
    length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10 AND
    length(trim(pickup_location)) >= 2 AND
    length(trim(drop_location)) >= 2 AND
    status = 'pending'
  );

-- B. AUTHENTICATED ADMIN POLICIES
-- Authenticated staff/administrators have full operational read & update access
CREATE POLICY "Allow authenticated staff to read quotes"
  ON public.quote_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated staff to update quotes"
  ON public.quote_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- C. RATE LIMIT TABLE POLICIES (Service Role & Authenticated Only)
CREATE POLICY "Allow service_role full access on rate limits"
  ON public.quote_rate_limits
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. IDEMPOTENCY & DUPLICATE SUBMISSION DETECTION HELPER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_duplicate_quote(
  p_phone TEXT,
  p_pickup TEXT,
  p_drop TEXT,
  p_window_minutes INT DEFAULT 5
)
RETURNS TABLE(is_duplicate BOOLEAN, existing_quote_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_phone TEXT;
  v_quote_id TEXT;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  SELECT quote_id INTO v_quote_id
  FROM public.quote_requests
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = v_clean_phone
    AND lower(trim(pickup_location)) = lower(trim(p_pickup))
    AND lower(trim(drop_location)) = lower(trim(p_drop))
    AND created_at >= now() - (p_window_minutes || ' minutes')::INTERVAL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_quote_id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_quote_id;
  ELSE
    RETURN QUERY SELECT false, NULL::TEXT;
  END IF;
END;
$$;

-- ============================================================================
-- 7. DATABASE WEBHOOK CONFIGURATION: STN-booking-webhook
-- ============================================================================
-- Configuration Parameters:
-- Webhook Name: STN-booking-webhook
-- Table: public.quote_requests
-- Events: INSERT
-- Webhook URL: https://jhwrxhurouuoformarxq.supabase.co/functions/v1/submit-quote
-- HTTP Method: POST
-- HTTP Headers:
--   Content-Type: application/json
--   Authorization: Bearer <SUPABASE_ANON_KEY>
-- ============================================================================

