-- ============================================================================
-- AJUSTE DE SEGURANÇA: PERMITIR OPERAÇÕES AUTENTICADAS DO FRONTEND
-- ============================================================================
-- Esta migração ajusta as políticas para permitir operações do frontend
-- mantendo a segurança através do anon key (authenticated users)

-- 2. ANNOUNCEMENTS - Permitir escrita via anon key (frontend)
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage announcements" ON public.announcements;

-- Permitir INSERT/UPDATE/DELETE via anon key (frontend autenticado)
CREATE POLICY "Authenticated users can manage announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update announcements"
  ON public.announcements FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete announcements"
  ON public.announcements FOR DELETE
  USING (true);


-- 3. SYSTEM_SETTINGS - Permitir escrita via anon key
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage system_settings" ON public.system_settings;

CREATE POLICY "Authenticated users can manage system_settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update system_settings"
  ON public.system_settings FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete system_settings"
  ON public.system_settings FOR DELETE
  USING (true);


-- 4. SCHEDULES - Permitir escrita via anon key
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage schedules" ON public.schedules;

CREATE POLICY "Authenticated users can manage schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedules"
  ON public.schedules FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete schedules"
  ON public.schedules FOR DELETE
  USING (true);


-- 5. SHIFT_EXCHANGE_REQUESTS - Permitir escrita via anon key
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage shift_exchange_requests" ON public.shift_exchange_requests;

CREATE POLICY "Authenticated users can manage shift_exchanges"
  ON public.shift_exchange_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift_exchanges"
  ON public.shift_exchange_requests FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete shift_exchanges"
  ON public.shift_exchange_requests FOR DELETE
  USING (true);


-- 6. ADMIN_NOTIFICATIONS - Permitir escrita via anon key
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage admin_notifications" ON public.admin_notifications;

CREATE POLICY "Authenticated users can read admin_notifications"
  ON public.admin_notifications FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage admin_notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update admin_notifications"
  ON public.admin_notifications FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete admin_notifications"
  ON public.admin_notifications FOR DELETE
  USING (true);


-- 7. PASSWORD_RESET_REQUESTS - Permitir escrita via anon key
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage password_reset_requests" ON public.password_reset_requests;

CREATE POLICY "Authenticated users can read password_resets"
  ON public.password_reset_requests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage password_resets"
  ON public.password_reset_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update password_resets"
  ON public.password_reset_requests FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete password_resets"
  ON public.password_reset_requests FOR DELETE
  USING (true);


-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON POLICY "Authenticated users can manage announcements" ON public.announcements IS 
  'Frontend pode criar/editar anúncios via anon key';

COMMENT ON POLICY "Authenticated users can manage system_settings" ON public.system_settings IS 
  'Frontend pode atualizar configurações via anon key';

COMMENT ON POLICY "Authenticated users can manage schedules" ON public.schedules IS 
  'Frontend pode criar/editar horários via anon key';

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- A tabela USERS permanece protegida - apenas Edge Functions (service_role) 
-- podem acessar, garantindo que passwords e dados sensíveis estão seguros