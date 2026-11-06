-- A role that RLS always applies to (docs/design/11-data-model.md 11.5).
--
-- Row-level security does nothing for a superuser or a BYPASSRLS role, and the
-- bundled docker stack connects as exactly that (the POSTGRES_USER that owns
-- the tables). Every query that relied on RLS alone then saw every site's
-- rows. `forSite()` / `forUser()` now drop to this role for the length of
-- their transaction (SET LOCAL ROLE), so the policies hold whatever role the
-- API connects with; work outside those scopes (migrations, partition
-- upkeep, host lookups) keeps the connection's own rights.
--
-- The role cannot log in. Creating it needs CREATEROLE: without that the
-- migration only warns and the API logs an error at start-up instead.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumio_rls') THEN
    CREATE ROLE lumio_rls NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
  END IF;
  EXECUTE format('GRANT lumio_rls TO %I', current_user);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'lumio_rls was not created (needs CREATEROLE); RLS is only as strong as the connecting role';
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumio_rls') THEN
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO lumio_rls', current_schema());
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO lumio_rls', current_schema());
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO lumio_rls', current_schema());
    -- Tables later migrations (and the monthly pageview partitions) create.
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lumio_rls', current_schema());
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO lumio_rls', current_schema());
  END IF;
END
$$;
