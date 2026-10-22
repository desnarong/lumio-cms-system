import { Injectable } from '@nestjs/common';
import {
  blockTreeSchema,
  type GlobalBlockKind,
  type GlobalBlocks,
  type UpdateGlobalBlockInput,
} from '@lumio/shared';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const readBlocks = (value: unknown): GlobalBlocks['header'] => {
  const parsed = blockTreeSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

/**
 * Header and footer as global blocks (docs/design/08-theme-design-panel.md 8.3).
 * One edit updates every page, because the renderer reads these instead of the
 * page's own blocks.
 */
@Injectable()
export class GlobalBlocksService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  get(siteId: string): Promise<GlobalBlocks> {
    return this.db.forSite(siteId, (tx) => this.read(tx));
  }

  async update(
    siteId: string,
    kind: GlobalBlockKind,
    input: UpdateGlobalBlockInput,
    actorId: string,
  ): Promise<GlobalBlocks> {
    return this.db.forSite(siteId, async (tx) => {
      const existing = await tx.globalBlock.findFirst({
        where: { kind },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (existing) {
        await tx.globalBlock.update({
          where: { id: existing.id },
          data: { blocks: asJson(input.blocks) },
        });
      } else {
        await tx.globalBlock.create({
          data: {
            siteId,
            kind,
            name: kind === 'header' ? 'ส่วนหัวเว็บ' : 'ส่วนท้ายเว็บ',
            blocks: asJson(input.blocks),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'global_block.update',
          target: kind,
          meta: { blocks: input.blocks.length },
        },
      });

      return this.read(tx);
    });
  }

  private async read(tx: Prisma.TransactionClient): Promise<GlobalBlocks> {
    const rows = await tx.globalBlock.findMany({
      where: { kind: { in: ['header', 'footer'] } },
      select: { kind: true, blocks: true },
      orderBy: { updatedAt: 'desc' },
    });

    const result: GlobalBlocks = { header: [], footer: [] };
    for (const row of rows) {
      if (row.kind === 'header' && result.header.length === 0) {
        result.header = readBlocks(row.blocks);
      }
      if (row.kind === 'footer' && result.footer.length === 0) {
        result.footer = readBlocks(row.blocks);
      }
    }
    return result;
  }
}
