-- ==============================================================================
-- PayGuard V2 — Supabase Update Script (Secure Auth System)
-- ==============================================================================

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    profile_id TEXT,
    raw_text TEXT,
    extraction_confidence NUMERIC,
    parsed_data JSONB,
    report_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_full_time BOOLEAN NOT NULL DEFAULT true,
    is_cadre BOOLEAN NOT NULL DEFAULT false,
    weekly_hours NUMERIC NOT NULL DEFAULT 35,
    collective_agreement TEXT,
    contract_type TEXT NOT NULL DEFAULT 'CDI',
    bonus_variation_max NUMERIC NOT NULL DEFAULT 20,
    hours_variation_max NUMERIC NOT NULL DEFAULT 10,
    net_gross_ratio_min NUMERIC NOT NULL DEFAULT 0.6,
    net_gross_ratio_max NUMERIC NOT NULL DEFAULT 0.85,
    salary_variation_max NUMERIC NOT NULL DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    document_id TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Forcibly Add user_id column to existing tables (it will fail silently if it already exists, which is fine)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ==============================================================================
-- Row Level Security (RLS)
-- Guaranteed isolation: users can ONLY select, insert, update, or delete their OWN data.
-- ==============================================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies just in case
DROP POLICY IF EXISTS "Allow all access to documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all access to employee_profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Allow all access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;

-- Policies for Documents
CREATE POLICY "Users can insert their own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Policies for Employee Profiles
CREATE POLICY "Users can insert their own profiles" ON public.employee_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own profiles" ON public.employee_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profiles" ON public.employee_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profiles" ON public.employee_profiles FOR DELETE USING (auth.uid() = user_id);

-- Policies for Audit Logs
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Create updated_at trigger for documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- IDENTITY USAGE LIMITS (ANTI-ABUSE V2.1)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.identity_usage_limits (
    identity_hash TEXT PRIMARY KEY,
    analysis_count INTEGER NOT NULL DEFAULT 0,
    last_analysis_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (we bypass it via RPC with SECURITY DEFINER)
ALTER TABLE public.identity_usage_limits ENABLE ROW LEVEL SECURITY;

-- We want the server to increment via RPC securely
CREATE OR REPLACE FUNCTION increment_identity_usage(p_identity_hash TEXT, p_max_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INTEGER;
BEGIN
    -- Get or create the record, locking it for update
    INSERT INTO public.identity_usage_limits (identity_hash, analysis_count)
    VALUES (p_identity_hash, 0)
    ON CONFLICT (identity_hash) DO NOTHING;
    
    SELECT analysis_count INTO current_count 
    FROM public.identity_usage_limits 
    WHERE identity_hash = p_identity_hash 
    FOR UPDATE;
    
    IF current_count >= p_max_limit THEN
        RETURN FALSE; -- Limit reached
    END IF;
    
    -- Increment
    UPDATE public.identity_usage_limits 
    SET analysis_count = analysis_count + 1, last_analysis_at = now()
    WHERE identity_hash = p_identity_hash;
    
    RETURN TRUE; -- Allowed
END;
$$;
