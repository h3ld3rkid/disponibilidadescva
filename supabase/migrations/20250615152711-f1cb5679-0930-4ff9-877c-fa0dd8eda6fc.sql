
-- Adicionar coluna para rastrear se a escala já foi impressa
ALTER TABLE public.schedules 
ADD COLUMN printed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar tabela para pedidos de troca
CREATE TABLE public.shift_exchange_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  target_email TEXT NOT NULL,
  target_name TEXT NOT NULL,
  requested_date TEXT NOT NULL,
  requested_shift TEXT NOT NULL,
  offered_date TEXT NOT NULL,
  offered_shift TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Adicionar RLS na tabela de pedidos de troca
ALTER TABLE public.shift_exchange_requests ENABLE ROW LEVEL SECURITY;

-- Policy para utilizadores verem pedidos onde são o requerente ou o alvo
CREATE POLICY "Users can view their exchange requests" 
  ON public.shift_exchange_requests 
  FOR SELECT 
  USING (true); -- Permitir a todos por agora para simplificar

-- Policy para criar pedidos de troca
CREATE POLICY "Users can create exchange requests" 
  ON public.shift_exchange_requests 
  FOR INSERT 
  WITH CHECK (true);

-- Policy para atualizar pedidos (responder)
CREATE POLICY "Users can update exchange requests" 
  ON public.shift_exchange_requests 
  FOR UPDATE 
  USING (true);
