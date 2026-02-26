
-- Drop restrictive admin-only policies and replace with permissive ones matching other tables
DROP POLICY IF EXISTS "Admins can update tab_visibility" ON public.tab_visibility;
DROP POLICY IF EXISTS "Admins can insert tab_visibility" ON public.tab_visibility;
DROP POLICY IF EXISTS "Admins can delete tab_visibility" ON public.tab_visibility;

CREATE POLICY "Authenticated users can update tab_visibility"
ON public.tab_visibility FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can insert tab_visibility"
ON public.tab_visibility FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tab_visibility"
ON public.tab_visibility FOR DELETE
USING (true);
