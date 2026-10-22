-- Lets a signed-in user see their own memberships before any single site is
-- known. Needed by GET /sites and by membership resolution in the site guard
-- (docs/design/12-api.md 12.1).
--
-- Postgres combines multiple permissive policies with OR, so site-scoped access
-- through "site_isolation" keeps working unchanged.

CREATE POLICY "user_isolation" ON "site_members"
    FOR SELECT
    USING ("user_id" = NULLIF(current_setting('app.current_user', true), '')::uuid);
