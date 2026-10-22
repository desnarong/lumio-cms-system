import { Injectable } from '@nestjs/common';
import {
  isRole,
  type InviteMemberInput,
  type MemberSummary,
  type PaginationQuery,
  type Role,
  type UpdateMemberInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { Page } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { QuotaService } from '../billing/quota.service';
import { PrismaService } from '../prisma/prisma.service';

interface MemberUserRow {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface MemberRow {
  role: string;
  createdAt: Date;
  user: MemberUserRow;
}

const USER_SELECT = { id: true, email: true, name: true, avatarUrl: true } as const;

const toMemberSummary = (row: MemberRow): MemberSummary => ({
  userId: row.user.id,
  email: row.user.email,
  name: row.user.name,
  avatarUrl: row.user.avatarUrl,
  role: isRole(row.role) ? row.role : 'viewer',
  joinedAt: row.createdAt.toISOString(),
});

@Injectable()
export class MembersService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly quota: QuotaService,
  ) {}

  async list(siteId: string, page: PaginationQuery): Promise<Page<MemberSummary>> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.siteMember.findMany({
        where: { siteId },
        include: { user: { select: USER_SELECT } },
        orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
        take: page.limit + 1,
        ...(page.cursor
          ? { cursor: { siteId_userId: { siteId, userId: page.cursor } }, skip: 1 }
          : {}),
      }),
    );

    const items = rows.slice(0, page.limit).map(toMemberSummary);
    return { items, cursor: rows.length > page.limit ? (items.at(-1)?.userId ?? null) : null };
  }

  async invite(siteId: string, input: InviteMemberInput, actorId: string): Promise<MemberSummary> {
    this.assertAssignableRole(input.role);
    await this.quota.assertCanAddMember(siteId);

    const user = await this.db.user.findUnique({
      where: { email: input.email },
      select: USER_SELECT,
    });
    if (!user) {
      throw ApiException.notFound('ไม่พบผู้ใช้ที่ใช้อีเมลนี้ กรุณาให้เขาสมัครสมาชิกก่อน');
    }

    const existing = await this.db.forSite(siteId, (tx) =>
      tx.siteMember.findUnique({ where: { siteId_userId: { siteId, userId: user.id } } }),
    );
    if (existing) throw ApiException.conflict('ผู้ใช้นี้เป็นสมาชิกของเว็บอยู่แล้ว');

    const row = await this.db.forSite(siteId, (tx) =>
      tx.siteMember.create({
        data: { siteId, userId: user.id, role: input.role },
        include: { user: { select: USER_SELECT } },
      }),
    );
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'member.invite',
      target: user.id,
      meta: { role: input.role },
    });

    return toMemberSummary(row);
  }

  async updateRole(
    siteId: string,
    userId: string,
    input: UpdateMemberInput,
    actorId: string,
  ): Promise<MemberSummary> {
    this.assertAssignableRole(input.role);

    const target = await this.findMember(siteId, userId);
    if (target.role === 'owner') {
      throw ApiException.forbidden('ไม่สามารถเปลี่ยนบทบาทของเจ้าของเว็บได้');
    }

    const row = await this.db.forSite(siteId, (tx) =>
      tx.siteMember.update({
        where: { siteId_userId: { siteId, userId } },
        data: { role: input.role },
        include: { user: { select: USER_SELECT } },
      }),
    );
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'member.update_role',
      target: userId,
      meta: { from: target.role, to: input.role },
    });

    return toMemberSummary(row);
  }

  async remove(siteId: string, userId: string, actorId: string): Promise<void> {
    const target = await this.findMember(siteId, userId);
    if (target.role === 'owner') {
      throw ApiException.forbidden('ไม่สามารถลบเจ้าของเว็บได้ กรุณาโอนความเป็นเจ้าของก่อน');
    }

    await this.db.forSite(siteId, (tx) =>
      tx.siteMember.delete({ where: { siteId_userId: { siteId, userId } } }),
    );
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'member.remove',
      target: userId,
      meta: { role: target.role },
    });
  }

  private async findMember(siteId: string, userId: string): Promise<{ role: string }> {
    const member = await this.db.forSite(siteId, (tx) =>
      tx.siteMember.findUnique({
        where: { siteId_userId: { siteId, userId } },
        select: { role: true },
      }),
    );
    if (!member) throw ApiException.notFound('ไม่พบสมาชิกคนนี้ในเว็บ');
    return member;
  }

  private assertAssignableRole(role: Role): void {
    if (role === 'owner') {
      throw ApiException.validation('เว็บหนึ่งมีเจ้าของได้เพียงคนเดียว');
    }
  }
}
