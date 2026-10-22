import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { AuthGuard } from '../auth/auth.guard';
import { TemplatesService } from './templates.service';

/** Template catalogue for the wizard and the Design screen. */
@Controller('v1/templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list() {
    return ok(this.templates.list());
  }

  @Get(':templateId')
  detail(@Param('templateId') templateId: string) {
    return ok(this.templates.summaryById(templateId));
  }
}