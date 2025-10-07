-- ============================================================================
-- CORREÇÃO SEGURANÇA: HABILITAR RLS EM TABELAS RESTANTES (PARTE 3/4)
-- ============================================================================
-- Habilitando RLS nas próximas 2 tabelas

-- TABELA 5: ADMIN_NOTIFICATIONS
-- ============================================================================
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_notifications' 
    AND policyname = 'Authenticated users can read admin_notifications'
  ) THEN
    CREATE POLICY "Authenticated users can read admin_notifications"
      ON public.admin_notifications FOR SELECT
      USING (true);
  END IF;
END $$;


-- TABELA 6: PASSWORD_RESET_REQUESTS
-- ============================================================================
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'password_reset_requests' 
    AND policyname = 'Authenticated users can read password_resets'
  ) THEN
    CREATE POLICY "Authenticated users can read password_resets"
      ON public.password_reset_requests FOR SELECT
      USING (true);
  END IF;
END $$;


-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('admin_notifications', 'password_reset_requests')
  AND rowsecurity = false;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: RLS ainda não está habilitado em algumas tabelas!';
  END IF;
  
  RAISE NOTICE 'RLS habilitado com sucesso em admin_notifications e password_reset_requests';
END $$;