-- Allow FK cascade delete from case_alloggio_submissions to append-only tables.
-- Direct delete is already prevented by privileges (DELETE revoked from authenticated).

drop trigger if exists trg_guest_status_events_append_only_delete on public.guest_status_events;
drop trigger if exists trg_guest_profile_audit_append_only_delete on public.guest_profile_audit;
