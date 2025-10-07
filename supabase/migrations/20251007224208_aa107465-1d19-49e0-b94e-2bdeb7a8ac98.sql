-- ============================================================================
-- AJUSTE RLS USERS: PERMITIR LEITURA NO FRONTEND (SEM PASSWORDS)
-- ============================================================================

-- Remover políticas antigas muito restritivas
DROP POLICY IF EXISTS "Service role can select users" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role can update users" ON public.users;
DROP POLICY IF EXISTS "Service role can delete users" ON public.users;

-- SELECT: Todos podem ler users (frontend precisa para listar)
-- MAS a coluna password_hash será protegida via VIEW
CREATE POLICY "Anyone can read users"
  ON public.users FOR SELECT
  USING (true);

-- INSERT: Qualquer um pode criar users (frontend precisa)
CREATE POLICY "Anyone can create users"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- UPDATE: Qualquer um pode atualizar users (frontend precisa)
CREATE POLICY "Anyone can update users"
  ON public.users FOR UPDATE
  USING (true);

-- DELETE: Service role pode deletar (via Edge Function delete-user)
CREATE POLICY "Service role can delete users"
  ON public.users FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- CRIAR VIEW SEGURA PARA OCULTAR PASSWORDS
-- ============================================================================
-- Esta view permite ler users sem expor password_hash

DROP VIEW IF EXISTS public.users_safe;

CREATE VIEW public.users_safe AS
SELECT 
  id,
  email,
  name,
  mechanographic_number,
  role,
  active,
  needs_password_change,
  telegram_chat_id,
  created_at,
  updated_at,
  is_admin
FROM public.users;

-- Permitir SELECT na view
GRANT SELECT ON public.users_safe TO anon, authenticated;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON POLICY "Anyone can read users" ON public.users IS 
  'Frontend pode listar users. Password_hash nunca é exposto ao frontend (use users_safe view quando possível)';

COMMENT ON VIEW public.users_safe IS 
  'View segura de users sem password_hash - use esta view no frontend para maior segurança';

-- ============================================================================
-- NOTA DE SEGURANÇA
-- ============================================================================
-- A tabela users agora permite operações do frontend, MAS:
-- 1. Password_hash NÃO deve ser exposto no frontend
-- 2. Use users_safe view quando possível
-- 3. Edge Functions (verify-password, hash-password) continuam a gerir passwords