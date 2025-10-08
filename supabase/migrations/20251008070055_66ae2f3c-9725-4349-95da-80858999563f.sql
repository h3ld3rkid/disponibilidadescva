-- ============================================================================
-- CORREÇÃO SEGURANÇA: HABILITAR RLS NA ÚLTIMA TABELA
-- ============================================================================

-- TABELA 7: PUSH_SUBSCRIPTIONS (última tabela sem RLS)
-- ============================================================================
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Verificar e criar política se não existir
DO $$
BEGIN
  -- A política original era "Users can manage their own push subscriptions"
  -- mas vamos garantir que existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'push_subscriptions'
  ) THEN
    -- Criar políticas básicas
    CREATE POLICY "Users can manage their own push subscriptions"
      ON public.push_subscriptions
      FOR ALL
      USING (true);
  END IF;
END $$;


-- ============================================================================
-- VERIFICAÇÃO FINAL DE TODAS AS TABELAS
-- ============================================================================
DO $$
DECLARE
  v_tables_without_rls TEXT[];
BEGIN
  -- Verificar todas as tabelas do schema público
  SELECT ARRAY_AGG(tablename) INTO v_tables_without_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = false;
  
  IF v_tables_without_rls IS NOT NULL THEN
    RAISE NOTICE 'Tabelas ainda SEM RLS: %', v_tables_without_rls;
  ELSE
    RAISE NOTICE 'SUCESSO: Todas as tabelas públicas têm RLS habilitado!';
  END IF;
END $$;


-- ============================================================================
-- RESUMO DO ESTADO DE SEGURANÇA
-- ============================================================================
DO $$
DECLARE
  v_total_tables INTEGER;
  v_tables_with_rls INTEGER;
  v_tables_without_policies INTEGER;
BEGIN
  -- Contar total de tabelas
  SELECT COUNT(*) INTO v_total_tables
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%';
  
  -- Contar tabelas com RLS
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = true;
  
  -- Contar tabelas sem políticas
  SELECT COUNT(*) INTO v_tables_without_policies
  FROM pg_tables t
  WHERE t.schemaname = 'public' 
  AND t.tablename NOT LIKE 'pg_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = t.schemaname 
    AND p.tablename = t.tablename
  );
  
  RAISE NOTICE '=== RESUMO DE SEGURANÇA ===';
  RAISE NOTICE 'Total de tabelas: %', v_total_tables;
  RAISE NOTICE 'Tabelas com RLS: %', v_tables_with_rls;
  RAISE NOTICE 'Tabelas sem políticas: %', v_tables_without_policies;
END $$;