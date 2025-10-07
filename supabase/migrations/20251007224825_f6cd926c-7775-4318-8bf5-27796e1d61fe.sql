-- ============================================================================
-- CORREÇÃO SEGURANÇA: HABILITAR RLS EM TABELAS RESTANTES (PARTE 2/3)
-- ============================================================================
-- Habilitando RLS nas próximas 2 tabelas

-- TABELA 3: SCHEDULES
-- ============================================================================
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'schedules' 
    AND policyname = 'Anyone can read schedules'
  ) THEN
    CREATE POLICY "Anyone can read schedules"
      ON public.schedules FOR SELECT
      USING (true);
  END IF;
END $$;


-- TABELA 4: SHIFT_EXCHANGE_REQUESTS
-- ============================================================================
ALTER TABLE public.shift_exchange_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shift_exchange_requests' 
    AND policyname = 'Anyone can read shift_exchange_requests'
  ) THEN
    CREATE POLICY "Anyone can read shift_exchange_requests"
      ON public.shift_exchange_requests FOR SELECT
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
  AND tablename IN ('schedules', 'shift_exchange_requests')
  AND rowsecurity = false;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: RLS ainda não está habilitado em algumas tabelas!';
  END IF;
  
  RAISE NOTICE 'RLS habilitado com sucesso em schedules e shift_exchange_requests';
END $$;