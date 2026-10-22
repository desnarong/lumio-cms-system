import { Injectable } from "@nestjs/common";
import { Db } from "../../db/db.service";
import { AuditService } from "../../audit/audit.service";

@Injectable()
export class __NAME__Service {
  constructor(private readonly db: Db, private readonly audit: AuditService) {}

  list(siteId: string) {
    return this.db.forSite(siteId).__TABLE__.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  async create(siteId: string, dto: Create__NAME__Dto) {
    const row = await this.db.forSite(siteId).__TABLE__.create({ data: dto });
    await this.audit.log({ action: "__NAME__.create", target: row.id, meta: { siteId } });
    return row;
  }
}
