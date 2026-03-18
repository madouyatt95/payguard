-- ==============================================================================
-- PayGuard V1.5 — Supabase Initialization Script
-- ==============================================================================
-- Instructions:
-- 1. Create a new project on Supabase.
-- 2. Go to the "SQL Editor" in your Supabase dashboard.
-- 3. Paste this entire script and click "Run".
-- ==============================================================================

-- 1. Documents Table
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

-- 2. Employee Profiles Table
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

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    document_id TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow all for MVP
-- In a real production app with users, you would set up specific policies tied to auth.uid()
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to documents" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow all access to employee_profiles" ON public.employee_profiles FOR ALL USING (true);
CREATE POLICY "Allow all access to audit_logs" ON public.audit_logs FOR ALL USING (true);

-- Create updated_at trigger for documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
