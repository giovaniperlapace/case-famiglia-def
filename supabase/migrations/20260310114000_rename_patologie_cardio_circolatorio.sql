-- Rename pathology value:
-- "Malattie del sistema circolatorio"
-- -> "Malattie del sistema cardio-circolatorio"
--
-- This migration updates existing persisted values only when the old token is present.

do $$
declare
  old_value text := 'Malattie del sistema circolatorio';
  new_value text := 'Malattie del sistema cardio-circolatorio';
begin
  -- 1) Current guest snapshot values
  update public.case_alloggio_submissions
  set patologie = regexp_replace(
    patologie,
    '(^|,\\s*)' || old_value || '(\\s*,|$)',
    '\\1' || new_value || '\\2',
    'g'
  )
  where patologie is not null
    and patologie like '%' || old_value || '%';

  -- 2) Historical status event payload values
  update public.guest_status_events
  set payload = jsonb_set(
    payload,
    '{patologie}',
    to_jsonb(
      regexp_replace(
        payload->>'patologie',
        '(^|,\\s*)' || old_value || '(\\s*,|$)',
        '\\1' || new_value || '\\2',
        'g'
      )
    ),
    true
  )
  where payload ? 'patologie'
    and coalesce(payload->>'patologie', '') like '%' || old_value || '%';
end $$;
