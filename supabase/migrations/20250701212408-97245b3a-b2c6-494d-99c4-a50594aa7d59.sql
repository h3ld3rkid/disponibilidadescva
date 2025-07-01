
-- Adicionar configurações para o sistema de emails
INSERT INTO public.system_settings (key, value, description) VALUES 
('email_notifications_enabled', 'true', 'Enable/disable email notifications for shift exchanges'),
('smtp_from_email', 'noreply@cruzvermelha-amares.pt', 'Email address to send notifications from'),
('app_name', 'Cruz Vermelha Amares', 'Application name for email templates')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Adicionar colunas para rastrear notificações
ALTER TABLE public.shift_exchange_requests 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- Habilitar realtime para shift_exchange_requests
ALTER TABLE public.shift_exchange_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_exchange_requests;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_target_email ON public.shift_exchange_requests(target_email);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_status ON public.shift_exchange_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_email_sent ON public.shift_exchange_requests(email_sent) WHERE email_sent = FALSE;
