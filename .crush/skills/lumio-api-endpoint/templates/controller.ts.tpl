import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/auth.guard";
import { SiteGuard } from "../../site/site.guard";
import { RolesGuard, Roles } from "../../rbac/roles.guard";
import { CurrentSite } from "../../site/current-site.decorator";
import { __NAME__Service } from "./__NAME__.service";
import { Create__NAME__Dto, Create__NAME__Schema } from "@lumio/shared";

@Controller("api/v1/__ROUTE__")
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class __NAME__Controller {
  constructor(private readonly service: __NAME__Service) {}

  @Get()
  @Roles("editor", "admin", "owner")
  list(@CurrentSite() siteId: string) {
    return this.service.list(siteId);
  }

  @Post()
  @Roles("admin", "owner")
  create(@CurrentSite() siteId: string, @Body() body: unknown) {
    const dto = Create__NAME__Schema.parse(body);
    return this.service.create(siteId, dto);
  }
}
