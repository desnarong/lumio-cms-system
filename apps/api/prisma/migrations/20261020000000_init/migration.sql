-- Lumio initial schema
-- Generated from prisma/schema.prisma, then extended with the constraints,
-- partitioning and Row-Level Security policies Prisma cannot express.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "totp_secret" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "locale_default" TEXT NOT NULL DEFAULT 'th',
    "locales" TEXT[] DEFAULT ARRAY['th']::TEXT[],
    "template_id" UUID,
    "theme_tokens" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_members" (
    "site_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_members_pkey" PRIMARY KEY ("site_id","user_id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "ssl_status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT,
    "mime" TEXT,
    "size_bytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "focal_point" JSONB,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "folder" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'th',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "blocks_draft" JSONB NOT NULL DEFAULT '[]',
    "blocks_published" JSONB,
    "excerpt" TEXT,
    "cover_media_id" UUID,
    "author_id" UUID,
    "seo" JSONB NOT NULL DEFAULT '{}',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "blocks" JSONB NOT NULL,
    "created_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_taxonomies" (
    "content_id" UUID NOT NULL,
    "taxonomy_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,

    CONSTRAINT "content_taxonomies_pkey" PRIMARY KEY ("content_id","taxonomy_id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "name" TEXT,
    "kind" TEXT,
    "blocks" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "name" TEXT,
    "fields" JSONB NOT NULL,
    "notify" JSONB NOT NULL DEFAULT '{}',
    "success_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "ip" INET,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirects" (
    "site_id" UUID NOT NULL,
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "code" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("site_id","from_path")
);

-- CreateTable
CREATE TABLE "site_apps" (
    "site_id" UUID NOT NULL,
    "app_key" TEXT NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_apps_pkey" PRIMARY KEY ("site_id","app_key")
);

-- CreateTable
-- Partitioned by ts (see docs/design/11-data-model.md 11.6). Partitioning is
-- invisible to Prisma, so the shadow database stays in sync with this file.
CREATE TABLE "pageviews" (
    "site_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "country" TEXT,
    "device" TEXT,
    "session_hash" TEXT,
    "ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE ("ts");

CREATE TABLE "pageviews_default" PARTITION OF "pageviews" DEFAULT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "site_id" UUID,
    "user_id" UUID,
    "action" TEXT,
    "target" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_subdomain_key" ON "sites"("subdomain");

-- CreateIndex
CREATE INDEX "site_members_user_id_idx" ON "site_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- CreateIndex
CREATE INDEX "domains_site_id_idx" ON "domains"("site_id");

-- CreateIndex
CREATE INDEX "media_site_id_folder_idx" ON "media"("site_id", "folder");

-- CreateIndex
CREATE INDEX "contents_site_id_type_status_published_at_idx" ON "contents"("site_id", "type", "status", "published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contents_site_id_locale_type_slug_key" ON "contents"("site_id", "locale", "type", "slug");

-- CreateIndex
CREATE INDEX "content_versions_content_id_created_at_idx" ON "content_versions"("content_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "content_versions_site_id_idx" ON "content_versions"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomies_site_id_kind_slug_key" ON "taxonomies"("site_id", "kind", "slug");

-- CreateIndex
CREATE INDEX "content_taxonomies_site_id_idx" ON "content_taxonomies"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "menus_site_id_location_key" ON "menus"("site_id", "location");

-- CreateIndex
CREATE INDEX "global_blocks_site_id_kind_idx" ON "global_blocks"("site_id", "kind");

-- CreateIndex
CREATE INDEX "forms_site_id_idx" ON "forms"("site_id");

-- CreateIndex
CREATE INDEX "form_submissions_form_id_created_at_idx" ON "form_submissions"("form_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "form_submissions_site_id_idx" ON "form_submissions"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_site_id_email_key" ON "subscribers"("site_id", "email");

-- CreateIndex
CREATE INDEX "audit_logs_site_id_created_at_idx" ON "audit_logs"("site_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "pageviews_site_id_ts_idx" ON "pageviews"("site_id", "ts" DESC);

-- CreateIndex
CREATE INDEX "pageviews_ts_idx" ON "pageviews" USING BRIN ("ts");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomies" ADD CONSTRAINT "taxonomies_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_taxonomies" ADD CONSTRAINT "content_taxonomies_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_taxonomies" ADD CONSTRAINT "content_taxonomies_taxonomy_id_fkey" FOREIGN KEY ("taxonomy_id") REFERENCES "taxonomies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_blocks" ADD CONSTRAINT "global_blocks_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_apps" ADD CONSTRAINT "site_apps_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_role_check" CHECK ("role" IN ('owner','admin','editor','author','viewer'));

-- AddCheckConstraint
ALTER TABLE "contents" ADD CONSTRAINT "contents_type_check" CHECK ("type" IN ('page','post'));

-- AddCheckConstraint
ALTER TABLE "contents" ADD CONSTRAINT "contents_status_check" CHECK ("status" IN ('draft','scheduled','published','archived'));

-- AddCheckConstraint
ALTER TABLE "taxonomies" ADD CONSTRAINT "taxonomies_kind_check" CHECK ("kind" IN ('category','tag'));

-- AddCheckConstraint
ALTER TABLE "menus" ADD CONSTRAINT "menus_location_check" CHECK ("location" IN ('header','footer','custom'));

-- AddCheckConstraint
ALTER TABLE "global_blocks" ADD CONSTRAINT "global_blocks_kind_check" CHECK ("kind" IS NULL OR "kind" IN ('header','footer','reusable'));

-- RowLevelSecurity
-- Every website-scoped table is isolated with the app.current_site session
-- variable (docs/design/11-data-model.md 11.5). FORCE makes the policy apply to
-- the table owner too, so isolation cannot be bypassed by the app connection.
-- Platform tables (users, sites) carry no RLS and are filtered in code.
-- site_members and domains stay without FORCE because membership and hostname
-- resolution must run before a site is known.
ALTER TABLE "contents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "contents"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "content_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "content_versions"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "taxonomies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "taxonomies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "taxonomies"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "content_taxonomies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_taxonomies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "content_taxonomies"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "media"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "menus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menus" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "menus"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "global_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "global_blocks" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "global_blocks"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "forms" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "forms"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "form_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_submissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "form_submissions"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscribers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "subscribers"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "redirects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "redirects" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "redirects"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "site_apps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_apps" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "site_apps"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "pageviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pageviews" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "pageviews"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "audit_logs"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "site_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "site_members"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);

ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_isolation" ON "domains"
    USING ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid)
    WITH CHECK ("site_id" = NULLIF(current_setting('app.current_site', true), '')::uuid);
