-- Fix search_path for calculate_nspire_deadline function
CREATE OR REPLACE FUNCTION public.calculate_nspire_deadline(p_severity severity_level)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  CASE p_severity
    WHEN 'severe' THEN RETURN CURRENT_DATE + INTERVAL '1 day';
    WHEN 'moderate' THEN RETURN CURRENT_DATE + INTERVAL '30 days';
    WHEN 'low' THEN RETURN CURRENT_DATE + INTERVAL '60 days';
    ELSE RETURN CURRENT_DATE + INTERVAL '60 days';
  END CASE;
END;
$$;