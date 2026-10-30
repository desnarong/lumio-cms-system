import { Injectable, Logger } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { ApiKey as ApiKeyRow } from '@prisma/client';
import {
  apiKeyHint,
  generateApiKeySecret,
  isApiKeyFormat,
  parseApiKeySecret,
  seoSchema,
  type ApiKey,
  type ApiKeyCreated,
  type ApiKeyInput,
  type ApiKeyList,
  type ApiKeyScope,
  type PublicApiDocument,
  type PublicApiDocumentList,
  type PublicApiListQuery,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const sameHash = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
};

const asScopes = (value: readonly string[]): ApiKeyScope[] =>
  value.filter((scope): scope is ApiKeyScope => scope === 'content:read');

const toView = (row: ApiKeyRow): ApiKey => ({
  id: row.id,
  name: row.name,
  hint: row.hint,
  scopes: asScopes(row.scopes),
  createdAt: row.createdAt.toISOString(),
  lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
});

export interface ApiKeyIdentity {
  siteId: string;
  keyId: string;
  scopes: ApiKeyScope[];
}

/**
 * Public API keys (docs/PROGRESS.md "งานนอก MVP"). The plaintext key is returned
 * once and never stored; the row keeps a SHA-256 hash. A presented key names its
 * site, which is what lets the lookup run inside that site's RLS scope.
 */
@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(siteId: string): Promise<ApiKeyList> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.apiKey.findMany({ orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }] }),
    );
    return { items: rows.map(toView) };
  }

  async create(siteId: string, input: ApiKeyInput, actorId: string): Promise<ApiKeyCreated> {
    const secret = generateApiKeySecret(siteId);
    const row = await this.db.forSite(siteId, (tx) =>
      tx.apiKey.create({
        data: {
          siteId,
          name: input.name,
          hint: apiKeyHint(secret),
          keyHash: sha256(secret),
          scopes: input.scopes,
          createdBy: actorId,
        },
      }),
    );

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'api_key.create',
      target: row.id,
      meta: { name: row.name, scopes: row.scopes },
    });

    // The secret only exists in this response; the stored row can never show it again.
    return { ...toView(row), secret };
  }

  /** Revoking keeps the row so the audit trail still points at something. */
  async revoke(siteId: string, keyId: string, actorId: string): Promise<ApiKey> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.apiKey.findUnique({ where: { id: keyId } });
      if (!current) throw ApiException.notFound('ไม่พบกุญแจนี้');
      return tx.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'api_key.revoke',
      target: keyId,
      meta: { name: row.name },
    });
    return toView(row);
  }

  /**
   * Reads the tenant a presented key belongs to. Unknown, revoked or malformed
   * keys all answer the same 401 so a probe learns nothing.
   */
  async authenticate(presented: string | undefined | null): Promise<ApiKeyIdentity> {
    const secret = (presented ?? '').trim();
    if (secret.length === 0) throw ApiException.unauthorized();
    const parsed = isApiKeyFormat(secret) ? parseApiKeySecret(secret) : null;
    if (!parsed) throw ApiException.unauthorized();

    const identity = await this.db.forSite(parsed.siteId, async (tx) => {
      const row = await tx.apiKey.findUnique({ where: { keyHash: sha256(secret) } });
      if (!row || row.revokedAt !== null) return null;
      if (!sameHash(row.keyHash, sha256(secret))) return null;
      await tx.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
      return { siteId: row.siteId, keyId: row.id, scopes: asScopes(row.scopes) };
    });

    if (!identity) throw ApiException.unauthorized();
    return identity;
  }

  /** Published, public documents of one site; members-only pages stay hidden. */
  async listDocuments(
    identity: ApiKeyIdentity,
    type: 'page' | 'post',
    query: PublicApiListQuery,
  ): Promise<PublicApiDocumentList> {
    this.requireRead(identity);
    const take = query.limit ?? 20;

    const [rows, total] = await this.db.forSite(identity.siteId, async (tx) => {
      const where = {
        type,
        status: 'published',
        archivedAt: null,
        access: 'public',
        ...(query.locale ? { locale: query.locale } : {}),
      };
      return Promise.all([
        tx.content.findMany({
          where,
          orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
          take,
          select: {
            id: true,
            type: true,
            slug: true,
            title: true,
            locale: true,
            publishedAt: true,
            updatedAt: true,
          },
        }),
        tx.content.count({ where }),
      ]);
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type === 'post' ? 'post' : 'page',
        slug: row.slug,
        title: row.title,
        locale: row.locale,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async findDocument(
    identity: ApiKeyIdentity,
    type: 'page' | 'post',
    slug: string,
    locale?: string,
  ): Promise<PublicApiDocument> {
    this.requireRead(identity);

    const row = await this.db.forSite(identity.siteId, (tx) =>
      tx.content.findFirst({
        where: {
          type,
          slug,
          status: 'published',
          archivedAt: null,
          access: 'public',
          ...(locale ? { locale } : {}),
        },
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      }),
    );
    if (!row) throw ApiException.notFound('ไม่พบเนื้อหานี้');

    const seo = seoSchema.safeParse(row.seo ?? {});
    return {
      id: row.id,
      type: row.type === 'post' ? 'post' : 'page',
      slug: row.slug,
      title: row.title,
      locale: row.locale,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      seo: seo.success
        ? { ...seo.data, noindex: false }
        : { noindex: false },
      blocks: Array.isArray(row.blocksPublished) ? row.blocksPublished : [],
    };
  }

  private requireRead(identity: ApiKeyIdentity): void {
    if (!identity.scopes.includes('content:read')) {
      this.logger.warn(`กุญแจ ${identity.keyId} ไม่มีสิทธิ์ content:read`);
      throw ApiException.forbidden('กุญแจนี้ไม่มีสิทธิ์อ่านเนื้อหา');
    }
  }
}
