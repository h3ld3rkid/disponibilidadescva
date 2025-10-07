-- ============================================================================
-- MIGRAÇÃO DE SEGURANÇA: HABILITAR RLS E POLÍTICAS GRANULARES
-- ============================================================================

-- 1. TABELA USERS - CRÍTICO: Contém dados sensíveis (passwords, emails)
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users table access" ON public.users;

-- SELECT: Apenas service_role pode ler (Edge Functions)
CREATE POLICY "Service role can select users"
  ON public.users FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- INSERT: Apenas service_role pode inserir
CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- UPDATE: Apenas service_role pode atualizar
CREATE POLICY "Service role can update users"
  ON public.users FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- DELETE: Apenas service_role pode deletar
CREATE POLICY "Service role can delete users"
  ON public.users FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');


-- 2. ANNOUNCEMENTS - Leitura pública, escrita restrita
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on announcements" ON public.announcements;

-- SELECT: Todos podem ler anúncios ativos
CREATE POLICY "Anyone can read announcements"
  ON public.announcements FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Apenas service_role (via Edge Functions)
CREATE POLICY "Service role can manage announcements"
  ON public.announcements FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- 3. SYSTEM_SETTINGS - Leitura pública, escrita restrita
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on system_settings" ON public.system_settings;

-- SELECT: Todos podem ler configurações públicas
CREATE POLICY "Anyone can read system_settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Apenas service_role
CREATE POLICY "Service role can manage system_settings"
  ON public.system_settings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- 4. SCHEDULES - Leitura pública, escrita restrita
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on schedules" ON public.schedules;

-- SELECT: Todos podem ler horários
CREATE POLICY "Anyone can read schedules"
  ON public.schedules FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Apenas service_role
CREATE POLICY "Service role can manage schedules"
  ON public.schedules FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- 5. SHIFT_EXCHANGE_REQUESTS - Leitura pública, escrita restrita
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on shift_exchange_requests" ON public.shift_exchange_requests;

-- SELECT: Todos podem ler pedidos de troca
CREATE POLICY "Anyone can read shift_exchange_requests"
  ON public.shift_exchange_requests FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Apenas service_role
CREATE POLICY "Service role can manage shift_exchange_requests"
  ON public.shift_exchange_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- 6. ADMIN_NOTIFICATIONS - Apenas service_role
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on admin_notifications" ON public.admin_notifications;

-- Apenas service_role pode acessar notificações de admin
CREATE POLICY "Service role can manage admin_notifications"
  ON public.admin_notifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- 7. PASSWORD_RESET_REQUESTS - Apenas service_role
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on password_reset_requests" ON public.password_reset_requests;

-- Apenas service_role pode acessar pedidos de reset
CREATE POLICY "Service role can manage password_reset_requests"
  ON public.password_reset_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- 8. PUSH_SUBSCRIPTIONS - Manter política existente (está boa)
-- ============================================================================
-- Já tem política adequada: "Users can manage their own push subscriptions"
-- Não precisa alterar


-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON POLICY "Service role can select users" ON public.users IS 
  'Edge Functions usam service_role para autenticação segura';

COMMENT ON POLICY "Anyone can read announcements" ON public.announcements IS 
  'Anúncios são públicos para leitura, mas apenas Edge Functions podem criar/editar';

COMMENT ON POLICY "Anyone can read system_settings" ON public.system_settings IS 
  'Configurações públicas (ex: allow_submission_after_15th) são legíveis por todos';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
-- Garantir que todas as tabelas críticas têm RLS habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'CRITICAL: RLS não está habilitado na tabela users!';
  END IF;
END $$;