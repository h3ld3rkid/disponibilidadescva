-- Enable Row Level Security on shift_exchange_requests table
ALTER TABLE public.shift_exchange_requests ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for shift_exchange_requests (since app handles auth differently)
CREATE POLICY "Allow all operations on shift_exchange_requests" 
ON public.shift_exchange_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);