-- Allow admins/managers to update any profile
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);
