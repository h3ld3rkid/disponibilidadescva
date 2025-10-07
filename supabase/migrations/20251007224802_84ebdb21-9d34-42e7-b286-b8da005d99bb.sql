-- ============================================================================
-- CORREÇÃO SEGURANÇA: HABILITAR RLS EM TABELAS RESTANTES (PARTE 1/3)
-- ============================================================================
-- Habilitando RLS nas primeiras 2 tabelas que ainda não têm

-- TABELA 1: ANNOUNCEMENTS
-- ============================================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Verificar se já tem políticas, se não criar
DO $$
BEGIN
  -- Se não existir política de SELECT, manter a que já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'announcements' 
    AND policyname = 'Anyone can read announcements'
  ) THEN
    CREATE POLICY "Anyone can read announcements"
      ON public.announcements FOR SELECT
      USING (true);
  END IF;
END $$;


-- TABELA 2: SYSTEM_SETTINGS
-- ============================================================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Verificar políticas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'system_settings' 
    AND policyname = 'Anyone can read system_settings'
  ) THEN
    CREATE POLICY "Anyone can read system_settings"
      ON public.system_settings FOR SELECT
      USING (true);
  END IF;
END $$;


-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Confirmar que RLS está habilitado
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('announcements', 'system_settings')
  AND rowsecurity = false;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: RLS ainda não está habilitado em algumas tabelas!';
  END IF;
  
  RAISE NOTICE 'RLS habilitado com sucesso em announcements e system_settings';
END $$;