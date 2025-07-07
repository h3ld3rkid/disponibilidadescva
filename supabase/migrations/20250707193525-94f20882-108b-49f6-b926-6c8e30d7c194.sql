-- Implementar políticas de segurança melhoradas

-- 1. Criar função para validar senhas fortes
CREATE OR REPLACE FUNCTION public.validate_password(password text)
RETURNS boolean AS $$
BEGIN
  -- Senha deve ter pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo
  RETURN LENGTH(password) >= 8 
    AND password ~ '[A-Z]' 
    AND password ~ '[a-z]' 
    AND password ~ '[0-9]' 
    AND password ~ '[^A-Za-z0-9]';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar tabela para logs de segurança
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Criar índices para monitorização
CREATE INDEX IF NOT EXISTS idx_security_logs_user_email ON public.security_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_success ON public.security_logs(success) WHERE success = false;

-- 4. RLS para security_logs - apenas admins podem ver
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security logs" 
ON public.security_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.email = auth.jwt() ->> 'email' 
    AND users.role = 'admin'
  )
);

-- 5. Melhorar RLS da tabela users - apenas próprio user e admins
DROP POLICY IF EXISTS "Anyone can select users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;

CREATE POLICY "Users can view their own data and admins can view all" 
ON public.users 
FOR SELECT 
USING (
  email = auth.jwt() ->> 'email' 
  OR 
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can update their own data and admins can update all" 
ON public.users 
FOR UPDATE 
USING (
  email = auth.jwt() ->> 'email' 
  OR 
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Only admins can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

-- 6. Melhorar RLS da tabela schedules - apenas próprio user e admins
DROP POLICY IF EXISTS "Anyone can access schedules for now" ON public.schedules;

CREATE POLICY "Users can view their own schedules and admins can view all" 
ON public.schedules 
FOR SELECT 
USING (
  user_email = auth.jwt() ->> 'email' 
  OR 
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert their own schedules and admins can insert all" 
ON public.schedules 
FOR INSERT 
WITH CHECK (
  user_email = auth.jwt() ->> 'email' 
  OR 
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can update their own schedules and admins can update all" 
ON public.schedules 
FOR UPDATE 
USING (
  user_email = auth.jwt() ->> 'email' 
  OR 
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete schedules" 
ON public.schedules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

-- 7. Melhorar RLS da tabela shift_exchange_requests
DROP POLICY IF EXISTS "Users can view their exchange requests" ON public.shift_exchange_requests;

CREATE POLICY "Users can view their own exchange requests" 
ON public.shift_exchange_requests 
FOR SELECT 
USING (
  requester_email = auth.jwt() ->> 'email' 
  OR target_email = auth.jwt() ->> 'email'
  OR 
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

-- 8. Melhorar RLS da tabela announcements - apenas admins podem gerir
DROP POLICY IF EXISTS "Anyone can manage announcements for now" ON public.announcements;

CREATE POLICY "Only admins can manage announcements" 
ON public.announcements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_check
    WHERE admin_check.email = auth.jwt() ->> 'email' 
    AND admin_check.role = 'admin'
  )
);

-- 9. Função para registar eventos de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_email TEXT,
  p_event_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_logs (
    user_email, 
    event_type, 
    ip_address, 
    user_agent, 
    success, 
    details
  ) VALUES (
    p_user_email, 
    p_event_type, 
    p_ip_address, 
    p_user_agent, 
    p_success, 
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger para detectar tentativas de login falhadas
CREATE OR REPLACE FUNCTION public.detect_failed_login_attempts()
RETURNS TRIGGER AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  -- Contar tentativas falhadas nas últimas 15 minutos
  SELECT COUNT(*) INTO failed_count
  FROM public.security_logs
  WHERE user_email = NEW.user_email
    AND event_type = 'failed_login'
    AND success = false
    AND created_at > now() - interval '15 minutes';
    
  -- Se mais de 5 tentativas falhadas, registar evento suspeito
  IF failed_count >= 5 THEN
    PERFORM public.log_security_event(
      NEW.user_email,
      'suspicious_activity',
      NEW.ip_address,
      NEW.user_agent,
      false,
      jsonb_build_object('reason', 'multiple_failed_logins', 'count', failed_count)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_failed_logins
  AFTER INSERT ON public.security_logs
  FOR EACH ROW
  WHEN (NEW.event_type = 'failed_login' AND NEW.success = false)
  EXECUTE FUNCTION public.detect_failed_login_attempts();