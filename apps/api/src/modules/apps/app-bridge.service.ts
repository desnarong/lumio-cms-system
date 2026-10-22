import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  findCatalogApp,
  isAppBridgeMethod,
  requiredScopeFor,
  type AppBridgeListResult,
  type AppBridgeMethod,
  type AppBridgeRequest,
  type AppBridgeResponse,
  type AppPermission,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { readAppManifest } from './apps.service';
import { appsPlatformDisabled, externalAppsEnabled } from './apps.config';

const LIST_LIMIT = 50;

interface CountRow {
  visitors: bigint;
  pageviews: bigint;
}

/**
 * The Lumio bridge for sandboxed Apps (docs/design/16-apps.md 16.4). Every call
 * from an App's iframe lands here; the bridge checks the App's declared scope
 * before running anything, so an App can never read more than the owner granted,
 * and never another site (the transaction is scoped with RLS).
 */
@Injectable()
export class AppBridgeService {
  constructor(private readonly db: PrismaService) {}

  async call(
    siteId: string,
    appKey: string,
    request: AppBridgeRequest,
    actorId: string | null,
  ): Promise<AppBridgeResponse> {
    if (!isAppBridgeMethod(request.method)) {
      throw ApiException.validation('App เรียกคำสั่งที่ไม่รองรับ');
    }

    if (appsPlatformDisabled()) {
      throw ApiException.forbidden('ขณะนี้ระบบปิดการใช้งาน App ชั่วคราว');
    }

    // Captured as a const so the narrowing survives into the transaction
    // callback below, where TypeScript cannot track `request.method` anymore.
    const method = request.method;
    const required = requiredScopeFor(method) as AppPermission;
    const catalog = findCatalogApp(appKey);

    return this.db.forSite(siteId, async (tx) => {
      const installed = await tx.siteApp.findUnique({
        where: { siteId_appKey: { siteId, appKey } },
        select: { enabled: true, source: true, manifest: true },
      });
      if (!installed) throw ApiException.notFound('App นี้ยังไม่ได้ติดตั้ง');
      if (!installed.enabled) throw ApiException.forbidden('App นี้ถูกปิดอยู่');
      if (installed.source === 'external' && !externalAppsEnabled()) {
        throw ApiException.forbidden('ระบบยังไม่เปิดรับ App จากภายนอก');
      }

      const manifest = readAppManifest(installed.manifest);
      const granted = catalog?.permissions ?? manifest?.permissions ?? [];
      if (!granted.includes(required)) {
        throw ApiException.forbidden('App นี้ไม่ได้รับสิทธิ์สำหรับคำสั่งนี้');
      }

      const result = await this.run(tx, method);

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'app.bridge_call',
          target: appKey,
          meta: { method: request.method, scope: required },
        },
      });

      return { id: request.id, ok: true, result };
    });
  }

  private async run(
    tx: Prisma.TransactionClient,
    method: AppBridgeMethod,
  ): Promise<unknown> {
    switch (method) {
      case 'contents.list': {
        const rows = await tx.content.findMany({
          where: { status: { not: 'archived' } },
          select: { id: true, title: true },
          orderBy: { updatedAt: 'desc' },
          take: LIST_LIMIT,
        });
        return { items: rows } satisfies AppBridgeListResult;
      }
      case 'forms.list': {
        const rows = await tx.form.findMany({
          select: { id: true, name: true },
          orderBy: { createdAt: 'desc' },
          take: LIST_LIMIT,
        });
        return { items: rows.map((row) => ({ id: row.id, title: row.name ?? 'ฟอร์ม' })) } satisfies AppBridgeListResult;
      }
      case 'media.list': {
        const rows = await tx.media.findMany({
          where: { status: { not: 'trashed' } },
          select: { id: true, filename: true },
          orderBy: { createdAt: 'desc' },
          take: LIST_LIMIT,
        });
        return {
          items: rows.map((row) => ({ id: row.id, title: row.filename ?? 'ไฟล์' })),
        } satisfies AppBridgeListResult;
      }
      case 'analytics.summary': {
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const totals = await tx.$queryRaw<CountRow[]>`
          SELECT COUNT(DISTINCT "session_hash")::bigint AS visitors, COUNT(*)::bigint AS pageviews
          FROM "pageviews"
          WHERE "ts" >= ${from}
        `;
        return {
          visitors: Number(totals[0]?.visitors ?? 0),
          pageviews: Number(totals[0]?.pageviews ?? 0),
        };
      }
    }
  }
}
