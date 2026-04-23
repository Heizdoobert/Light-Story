-- Allow Edge Functions running as service_role to call role helper functions.

revoke all on function app_private.has_role(text[]) from public;
grant execute on function app_private.has_role(text[]) to anon, authenticated, service_role, postgres;
