import { Injectable } from '@nestjs/common';
import {
  blockTreeSchema,
  type CreateSectionTemplateInput,
  type SectionTemplate,
  type UpdateSectionTemplateInput,
} from '@lumio/shared';
import { Prisma, type SectionTemplate as SectionTemplateRow } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const toSectionTemplate = (row: SectionTemplateRow): SectionTemplate => {
  const parsed = blockTreeSchema.safeParse(row.blocks);
  return {
    id: row.id,
    name: row.name,
    blocks: parsed.success ? parsed.data : [],
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
};

/**
 * Sections the owner saved from the editor to reuse on other pages
 * (docs/design/07-blocks.md 7.2). Saved sections are site data, so every query
 * runs inside `forSite` and is isolated by RLS.
 */
@Injectable()
export class SectionTemplatesService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(siteId: string): Promise<SectionTemplate[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.sectionTemplate.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
      }),
    );

    return rows.map(toSectionTemplate);
  }

  async create(
    siteId: string,
    input: CreateSectionTemplateInput,
    actorId: string,
  ): Promise<SectionTemplate> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const created = await tx.sectionTemplate.create({
        data: {
          siteId,
          name: input.name,
          blocks: asJson(input.blocks),
          createdBy: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'section_template.create',
          target: created.id,
          meta: { name: input.name, blocks: input.blocks.length },
        },
      });

      return created;
    });

    return toSectionTemplate(row);
  }

  /** Renames a saved section from the Design screen; the blocks are untouched. */
  async rename(
    siteId: string,
    id: string,
    input: UpdateSectionTemplateInput,
    actorId: string,
  ): Promise<SectionTemplate> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.sectionTemplate.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบเทมเพลตส่วนนี้');

      const updated = await tx.sectionTemplate.update({
        where: { id },
        data: { name: input.name },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'section_template.rename',
          target: id,
          meta: { from: current.name, to: input.name },
        },
      });

      return updated;
    });

    return toSectionTemplate(row);
  }

  async remove(siteId: string, id: string, actorId: string): Promise<void> {    await this.db.forSite(siteId, async (tx) => {
      const current = await tx.sectionTemplate.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบเทมเพลตส่วนนี้');

      await tx.sectionTemplate.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'section_template.delete',
          target: id,
          meta: { name: current.name },
        },
      });
    });
  }
}