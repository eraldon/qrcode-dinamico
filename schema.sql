-- =====================================================
-- SCHEMA PARA O SISTEMA DE QR CODES DINÂMICOS (SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase
-- =====================================================

-- 1. Criação da tabela principal de QR Codes
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    scans_count BIGINT DEFAULT 0 NOT NULL,
    last_scanned_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    category VARCHAR(50) DEFAULT 'Geral',
    -- Customização visual do QR Code
    foreground_color VARCHAR(20) DEFAULT '#000000',
    background_color VARCHAR(20) DEFAULT '#ffffff',
    dot_style VARCHAR(30) DEFAULT 'square', -- 'square', 'dots', 'rounded', 'classy'
    corner_style VARCHAR(30) DEFAULT 'square', -- 'square', 'dot', 'extra-rounded'
    logo_url TEXT
);

-- 2. Criação da tabela de registro de acessos (Analytics / Scans)
CREATE TABLE IF NOT EXISTS public.qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE,
    slug VARCHAR(64) NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    ip_hash TEXT -- Para contagem de visitantes únicos sem armazenar IP cru
);

-- 3. Índices para performance instantânea nos redirecionamentos
CREATE INDEX IF NOT EXISTS idx_qr_codes_slug ON public.qr_codes (slug);
CREATE INDEX IF NOT EXISTS idx_qr_scans_slug ON public.qr_scans (slug);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_scans (scanned_at);

-- 4. Função e trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_qr_code_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_qr_code_timestamp ON public.qr_codes;
CREATE TRIGGER trigger_update_qr_code_timestamp
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION update_qr_code_timestamp();

-- 5. Função RPC atômica para registrar scan e incrementar contador de forma segura
CREATE OR REPLACE FUNCTION record_qr_scan(target_slug VARCHAR, client_ua TEXT DEFAULT NULL, client_ref TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    found_id UUID;
    target_url TEXT;
    curr_status VARCHAR;
BEGIN
    -- Busca o QR Code ativo
    SELECT id, destination_url, status INTO found_id, target_url, curr_status
    FROM public.qr_codes
    WHERE slug = target_slug
    LIMIT 1;

    IF found_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF curr_status = 'paused' THEN
        RETURN 'PAUSED';
    END IF;

    -- Incrementa contagem e atualiza data
    UPDATE public.qr_codes
    SET scans_count = scans_count + 1,
        last_scanned_at = NOW()
    WHERE id = found_id;

    -- Registra log de scan detalhado
    INSERT INTO public.qr_scans (qr_code_id, slug, user_agent, referrer)
    VALUES (found_id, target_slug, client_ua, client_ref);

    RETURN target_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Habilitar Row Level Security (RLS) e Políticas Públicas
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso anônimo com a anon key do Supabase:
CREATE POLICY "Permitir leitura pública de qr_codes" 
ON public.qr_codes FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de qr_codes" 
ON public.qr_codes FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de qr_codes" 
ON public.qr_codes FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão pública de qr_codes" 
ON public.qr_codes FOR DELETE USING (true);

CREATE POLICY "Permitir inserção de scans" 
ON public.qr_scans FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de scans" 
ON public.qr_scans FOR SELECT USING (true);
