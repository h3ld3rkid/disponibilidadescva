-- Add broadcast_id column to group related broadcast requests
ALTER TABLE public.shift_exchange_requests 
ADD COLUMN broadcast_id uuid DEFAULT NULL;

-- Add index for faster queries on broadcast_id
CREATE INDEX idx_shift_exchange_requests_broadcast_id 
ON public.shift_exchange_requests(broadcast_id) 
WHERE broadcast_id IS NOT NULL;